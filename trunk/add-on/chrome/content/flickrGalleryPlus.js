/*
	Developed by Robert Nyman, http://www.robertnyman.com
*/ 
var flickrGalleryPlus = function () {
	var fileNameReplace = /\_s(\.jpg)/i,
		states = [],
		statusBarButton,
		startSlideshowText = "Start slideshow",
		stopSlideshowText = "Stop slideshow",
		slideTime = 3000,
		prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		
	init = function () {
		var autoRun = prefManager.getBoolPref("extensions.flickrgalleryplus.autorun"),
			mainImage;
		statusBarButton = document.getElementById("flickrGalleryPlus-status-bar");	
		if (autoRun && /flickr\.com\/photos\/[^\/]+\/sets\//i.test(content.location.href)) {
			mainImage = content.document.getElementById("primary_photo_img");
			if (mainImage) {
				mainImage.style.visibility = "hidden";
			}
			run(true);
		}
		else {
			var state = getState();
			if (state) {
				state.hasRun = false;
			}
			setStatusBar(true);
		}
	};
	
	run = function (atLoad) {
		var state = getState(),
			autoRun = prefManager.getBoolPref("extensions.flickrgalleryplus.autorun"),
			mainPhoto = content.document.getElementById("primary_photo_img"),
			head = content.document.getElementsByTagName("head")[0],
			script,
			link;
		if ((!atLoad || !autoRun) && state && state.hasRun) {
			state.hasRun = false;
			setStatusBar();
			content.location.reload();
		}
		else if (mainPhoto && head) {
			gBrowser.tabContainer.addEventListener("TabSelect", function () {
				stopSlideshow();
			}, false);
			
			link = content.document.createElement("link").wrappedJSObject;
			link.type = "text/css";
			link.rel = "stylesheet";
			link.href = "chrome://flickrgalleryplus/skin/flickrGalleryPlus.css";
			head.appendChild(link);
			
			script = content.document.createElement("script").wrappedJSObject;
			script.src = "chrome://flickrgalleryplus/content/jquery-1.2.6.min.js";
			script.type = "text/javascript";
			head.appendChild(script);
			
			slideTime = parseInt(prefManager.getIntPref("extensions.flickrgalleryplus.slideshowSlideTime"), 10);
			
			script.onload = applyGallery;
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
			state.hasRun = false;
			state.thumbnails = [];
			state.currentImageIndex = 0;
			state.primaryPhoto = null;
			state.imageTextContainer = null;
			state.loadingImage = null;
			state.timer = null;
			state.controlSlideshow = null;
			state.slideTimer = null;
			state.slideIncrementTimer = null;
			state.slideshowRunning = false;
			
			stopSlideshow();
		}
	};
	
	setStatusBar = function (disable) {
		var state = this.getState(),
			statusIcon = "chrome://flickrgalleryplus/skin/",
			statusText;
			
		if(state && state.hasRun && !disable) {
			statusIcon += "status-bar.png";
			statusText = "Disable Flickr Gallery Plus!";
			prefManager.setBoolPref("extensions.flickrgalleryplus.autorun", true);
		}
		else {
			statusIcon += "status-bar-disabled.png";
			statusText = "Activate Flickr Gallery Plus!";
			prefManager.setBoolPref("extensions.flickrgalleryplus.autorun", false);
		}
		statusBarButton.setAttribute("src", statusIcon);
		statusBarButton.setAttribute("tooltiptext", statusText);
	};
	
	applyGallery = function () {
		var state = getState(),
			tabIndex = getTabIndex();
		if(!state) {
			state = states[tabIndex] = {
				hasRun : true,
				thumbnails : [],
				currentImageIndex : 0,
				primaryPhoto : null,
				imageTextContainer : null,
				loadingImage : null,
				timer : null,
				controlSlideshow : null,
				slideTimer : null,
				slideIncrementTimer : null,
				slideshowRunning : false
			};
		}
		clearState();
		state.hasRun = true;
		
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
			this.style.visibility = "visible";
			if (state.slideshowRunning) {
				state.primaryPhoto.fadeTo(500, 1);
			}
			clearTimeout(state.timer);
			state.loadingImage.hide();
		});
		
		var thumbnailElms = $("#setThumbs .pc_img"),
			preloadImages = prefManager.getBoolPref("extensions.flickrgalleryplus.preloadImages");
		for (var i=0, il=thumbnailElms.length, thumbnail, thumbnailImg, thumbnailTitle, lastBy; i<il; i++) {
			thumbnail = $(thumbnailElms[i]);
			thumbnailImg = thumbnail[0];
			thumbnailTitle = thumbnailImg.alt;
			lastBy = thumbnailTitle.lastIndexOf("by");
			state.thumbnails.push({
				img : thumbnail,
				src : thumbnailImg.src.replace(fileNameReplace, "$1"),
				title : thumbnailTitle.substring(0, lastBy),
				href : thumbnail.parent("a").attr("href")
			});
			thumbnail.click(function (index) {
				return function (evt) {
					setImage(index);
					return false;
				};
			}(i));
		}
		
		setImage(0);
		
		$(content.document.wrappedJSObject).keypress(function (evt) {
			var keyCode = evt.keyCode,
				altKey = evt.originalEvent.altKey;
			if (!altKey) {
				if (keyCode === 37) {
					imageNavigation(true);
				}
				else if(keyCode === 39) {
					imageNavigation(false);
				}
			}
		});
		
		setStatusBar();
		
		if (preloadImages) {
			for (var j=0, jl=state.thumbnails.length, preload; j<jl; j++) {
				preload = content.document.createElement("img").wrappedJSObject;
				preload.setAttribute("src", state.thumbnails[j].src);
			}
		}
	};
	
	imageNavigation = function (back) {
		var state = getState(),
			imageIndex = state.currentImageIndex;
		if (back && imageIndex > 0) {
			setImage(imageIndex - 1);
		}
		else if (!back && imageIndex < (state.thumbnails.length - 1)) {
			setImage(imageIndex + 1);
		}
	};
	
	setImage = function (index) {
		var state = getState(),
			thumb = state.thumbnails[index],
			primary = state.primaryPhoto;
		state.timer = window.setTimeout(function () {
			state.loadingImage.show();
		}, 200);
		primary.attr("src", thumb.src);
		primary.parent("a").attr("href", thumb.href);
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
		var state = getState(),
		startAtFirstImage = prefManager.getBoolPref("extensions.flickrgalleryplus.startSlideshowAtFirstImage");
		state.slideshowRunning = true;
		state.controlSlideshow.text(stopSlideshowText);
		state.controlSlideshow.addClass("stop-slideshow");
		if (startAtFirstImage) {
			setImage(0);
		}
		state.slideTimer = setInterval(function () {
			if(state.currentImageIndex < (state.thumbnails.length - 1)) {
				state.primaryPhoto.fadeTo(500, 0.01);
				state.slideIncrementTimer = setTimeout(function () {
					imageNavigation(false);
				}, 500);
			}
			else {
				stopSlideshow();
			}
		}, slideTime);
		return false;
	};
	
	stopSlideshow = function () {
		var state = getState();
		if (state) {
			clearInterval(state.slideTimer);
			clearTimeout(state.slideIncrementTimer);
			state.slideshowRunning = false;
			if (state.controlSlideshow) {
				state.controlSlideshow.text(startSlideshowText);
				state.controlSlideshow.removeClass("stop-slideshow");
			}
			if (state.primaryPhoto) {
				state.primaryPhoto.fadeIn(500);
			}
		}
		return false;
	};
	
	incrementAndFade = function () {
		var state = getState();
		if (state.slideTimer) {
			setImage(state.currentImageIndex + 1);
		}	
	};
	
	return {
		init : init,
		run : run
	};
}();

flickrGalleryPlusWrapper = {
	onStatusbarButtonCommand : function (evt) {
		flickrGalleryPlus.run();
	}
};

window.addEventListener("load", function () {
	gBrowser.addEventListener("DOMContentLoaded", function () {
		flickrGalleryPlus.init();
	}, false);
}, false);