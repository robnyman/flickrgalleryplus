// ==UserScript==
// @name           flickrGalleryPlus
// @namespace      robertnyman.com
// @description    Get improved gallery behavior for Flickr
// @include        http://www.flickr.com/photos/*/sets/*
// @include        http://flickr.com/photos/*/sets/*
// ==/UserScript==
var flickrGalleryPlus = function () {
	var fileNameReplace = /\_s(\.jpg)/i,
		primaryPhoto,
		thumbnails,
		currentImageIndex = 0,
		loadingImage,
		timer,
		imageText;
	init = function () {
		var mainPhoto = document.getElementById("primary_photo_img"),
			head = document.getElementsByTagName("head")[0].wrappedJSObject,
			script,
			primaryPhoto;
		if (mainPhoto && head) {
			script = document.createElement("script").wrappedJSObject;
			script.src = "http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js";
			script.type = "text/javascript";
			
			head.appendChild(script);
			script.onload = applyGallery;
		}
	};
	applyGallery = function () {
		$ = unsafeWindow.jQuery;
		$("#TopBar .Header").css("width", "1000px");
		$("#Main").css("width", "1000px");
		$("#ViewSet").css("width", "1000px");
		$("#ViewSet .vsDetails").css("width", "500px");
		$("#ViewSet .vsDescription").prepend('<p id="flickrGalleryPlusImageText"></p>');
		imageText = $("#flickrGalleryPlusImageText");
		
		var body = $("body");
		body.append('<img id="flickrGalleryPlusLoadingImage" src="http://www.robertnyman.com/flickrGalleryPlusImages/loading.gif"');
		loadingImage = $("#flickrGalleryPlusLoadingImage");
		loadingImage.css({
			position : "absolute",
			left: ((body.width() / 2) - 16) + "px",
			top : "300px",
			background : "#fff",
			padding : "10px",
			border : "1px solid #333"
		});
		
		primaryPhoto = $("#primary_photo_img");
		primaryPhoto.removeAttr("width");
		primaryPhoto.removeAttr("height");
		primaryPhoto.load(function () {
			clearTimeout(timer);
			loadingImage.hide();
		});
		
		thumbnails = $("#setThumbs .pc_img");
		var	firstThumbNail = thumbnails.eq(0);
		setImage(0);
		
		for (var i=0, il=thumbnails.length; i<il; i++) {
			thumbnail = $(thumbnails[i]);
			thumbnail.click(function (index) {
				return function (evt) {
					setImage(index);
					return false;
				}
			}(i));
		};
		
		$(document).keydown(function (evt) {
			var keyCode = evt.keyCode,
				newIndex;
			if (keyCode === 37 && currentImageIndex > 0) {
				setImage(currentImageIndex - 1);
			}
			else if(keyCode === 39 && currentImageIndex < (thumbnails.length - 1)) {
				setImage(currentImageIndex + 1);
			}
		});
	};
	setImage = function (index) {
		timer = window.setTimeout(function () {
			loadingImage.show();
		}, 200);
		var img = thumbnails.eq(index),
			src = img[0].src.replace(fileNameReplace, "$1"),
			title = img[0].alt,
			href = img.parent("a").attr("href");
		primaryPhoto.attr("src", src);
		primaryPhoto.parent("a").attr("href", href);
		imageText.html(title);
		thumbnails.eq(currentImageIndex).css("outline", "0");
		currentImageIndex = index;
		img.css("outline", "2px solid #0063dc");
	};
	return {
		init : init
	};
}();
flickrGalleryPlus.init();