/*
	Developed by Robert Nyman, http://www.robertnyman.com
*/ 
var flickrGalleryPlus = function () {
	var fileNameReplace = /\_s(\.jpg)/i,
		states = [],
		startSlideshowText = "Start slideshow",
		stopSlideshowText = "Stop slideshow",
		slideTime = 3000,
		prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
		timer,
		imageText;
		
	init = function () {
		var mainPhoto = content.document.getElementById("primary_photo_img"),
			head = content.document.getElementsByTagName("head")[0],
			script,
			link;
		if (/flickr\.com/i.test(content.document.domain) && mainPhoto && head) {
			// statusBarButton = document.getElementById("flickrGalleryPlus-status-bar");
			// 			gBrowser.tabContainer.addEventListener("TabSelect", function () {
			// 				flickrGalleryPlus.setStatusBar.apply(flickrGalleryPlus, arguments);
			// 			}, false);
			
			// gBrowser.addEventListener("load", function () {
			// 				gBrowser.addEventListener("load", autoRun, false);
			// 			}, false);
			
			var link = content.document.createElement("link").wrappedJSObject;
			link.type = "text/css";
			link.rel = "stylesheet";
			link.href = "chrome://flickrGalleryPlus/skin/flickrGalleryPlus.css";
			head.appendChild(link);
			
			script = content.document.createElement("script").wrappedJSObject;
			script.src = "chrome://flickrGalleryPlus/content/jquery-1.2.6.min.js";
			script.type = "text/javascript";
			head.appendChild(script);
			
			slideTime = parseInt(prefManager.getIntPref("extensions.flickrGalleryPlus.slideshowSlideTime"), 10);
			
			script.onload = autoRun;
		}
	};
	
	autoRun = function () {
		var autoRun = prefManager.getBoolPref("extensions.flickrGalleryPlus.autorun");
		if (autoRun) {
			applyGallery();
		}
	};
	
	getState = function () {
		var tabIndex = this.getTabIndex(),
			state = states[tabIndex];
		return state;	
	};
	
	getTabIndex = function () {
		var browsers = gBrowser.browsers,
			tabIndex;
		for (var i=0, il=browsers.length, browser; i<il; i++) {
			if(gBrowser.getBrowserAtIndex(i).contentWindow === content) {
				tabIndex = i;
				break;
			}
		}
		return tabIndex;
	};
	
	clearState = function () {
		var state = this.getState();
		if (state) {
			state.thumbnails = [];
			stopSlideshow();
			//this.setStatusBar();
		}
	};
	
	setStatusBar = function () {
		
	};
	
	applyGallery = function () {
		var state = getState(),
			tabIndex = getTabIndex();
		if(!state) {
			state = states[tabIndex] = {
				thumbnails : [],
				currentImageIndex : 0,
				primaryPhoto : null,
				imageTextContainer : null,
				loadingImage : null,
				controlSlideshow : null,
				slideTimer : null,
				slideshowRunning : false
			};
		}
		clearState();
		
		$ = content.wrappedJSObject.jQuery;
		var thumbnailContainer = $("#ViewSet .vsThumbnail");
		
		thumbnailContainer.append('<p id="flickrGalleryPlusImageText"></p>');
		state.imageTextContainer = $("#flickrGalleryPlusImageText");
		
		thumbnailContainer.append('<p><a id="flickrGalleryPlusControlSlideshow">' + startSlideshowText + '</a></p>');
		state.controlSlideshow = $("#flickrGalleryPlusControlSlideshow");
		state.controlSlideshow.click(controlSlideshow);
		
		var body = $("body");
		body.append('<div id="flickrGalleryPlusLoadingImage"></div>');
		state.loadingImage = $("#flickrGalleryPlusLoadingImage");
		state.loadingImage.css("left", ((body.width() / 2) - 8) + "px");
		
		state.primaryPhoto = $("#primary_photo_img");
		state.primaryPhoto.removeAttr("width");
		state.primaryPhoto.removeAttr("height");
		state.primaryPhoto.load(function () {
			clearTimeout(timer);
			state.loadingImage.hide();
		});
		
		var thumbnailElms = $("#setThumbs .pc_img");
		for (var i=0, il=thumbnailElms.length, thumbnail, preload; i<il; i++) {
			thumbnail = $(thumbnailElms[i]);
			src = thumbnail[0].src.replace(fileNameReplace, "$1");
			state.thumbnails.push({
				img : thumbnail,
				src : src,
				title : thumbnail[0].alt,
				href : thumbnail.parent("a").attr("href")
			});
			preload = new Image();
			preload.src = src;	
			thumbnail.click(function (index) {
				return function (evt) {
					setImage(index);
					return false;
				}
			}(i));
		};
		
		setImage(0);
		
		$(content.document.wrappedJSObject).keypress(function (evt) {
			var state = getState(),
				keyCode = evt.keyCode,
				altKey = evt.originalEvent.altKey,
				imageIndex = state.currentImageIndex;
			if (!altKey) {
				if (keyCode === 37 && imageIndex > 0) {
					setImage(imageIndex - 1);
				}
				else if(keyCode === 39 && imageIndex < (state.thumbnails.length - 1)) {
					setImage(imageIndex + 1);
				}
			}
		});
	};
	
	setImage = function (index) {
		timer = window.setTimeout(function () {
			state.loadingImage.show();
		}, 200);
		var state = getState(),
			thumb = state.thumbnails[index];
		state.primaryPhoto.attr("src", thumb.src);
		state.primaryPhoto.parent("a").attr("href", thumb.href);
		state.imageTextContainer.html(thumb.title);
		state.thumbnails[state.currentImageIndex].img.removeClass("flickrGalleryPlus-selected");
		state.currentImageIndex = index;
		thumb.img.addClass("flickrGalleryPlus-selected");
	};
	
	controlSlideshow = function () {
		var state = getState();
		if (state.slideshowRunning) {
			stopSlideshow();
		}
		else {
			startSlideshow();
		}
	};
	
	startSlideshow = function () {
		var state = getState();
		state.slideshowRunning = true;
		state.controlSlideshow.text(stopSlideshowText);
		setImage(0);
		state.slideTimer = setInterval(function () {
			if(state.currentImageIndex < (state.thumbnails.length - 1)) {
				state.primaryPhoto.fadeOut(500);
				setTimeout(incrementAndFade, 500);
			}
			else {
				stopSlideshow();
			}
		}, slideTime);
		return false;
	};
	
	stopSlideshow = function () {
		var state = getState();
		clearInterval(state.slideTimer);
		state.slideshowRunning = false;
		if (state.controlSlideshow) {
			state.controlSlideshow.text(startSlideshowText);
		}
		return false;
	};
	
	incrementAndFade = function () {
		var state = getState();
		setImage(state.currentImageIndex + 1);
		state.primaryPhoto.fadeIn(500);
	};
	
	return {
		init : init
	};
}();

flickrGalleryPlusWrapper = {
	onMenuItemCommand : function (evt) {
		flickrGalleryPlus.run();
	},
	
	onContextMenuItemCommand : function (evt) {
		flickrGalleryPlus.run();
	},
	
	onStatusbarButtonCommand : function (evt) {
		flickrGalleryPlus.run();
	},
	
	onToolbarButtonCommand : function (evt) {
		flickrGalleryPlus.run();
	}
};

window.addEventListener("load", function () {
	gBrowser.addEventListener("DOMContentLoaded", function () {
		flickrGalleryPlus.init.apply(flickrGalleryPlus, arguments);
	}, false);
}, false);