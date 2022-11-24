/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";

import { import_data } from "./helpers.js";
//import { init, reset } from "./generate.js";

import { Scenes } from "./scenes.js";
import { Textboxes } from "./textboxes.js";

import "./map/map.js";


window.onload = function(ev) {

	// Disable mobile pinch-zoom
	document.addEventListener("touchmove", function(ev) {
		if(ev.scale !== 1) { ev.preventDefault(); }
	}, false);

	// Set up window resize start/end events
	let resizeTimer = false;
	$(window).on("resize", function(ev) {
		if( !resizeTimer ) { $(window).trigger("resizestart"); }
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(function() {
			resizeTimer = false;
			$(window).trigger("resizeend");
		}, 250);
	}).on("resizeend", function() { _SCENES.resize(); });

	// Set up nav-btn-fade-out
	let btnTimer = null,
		btnToggle = v => {
			$(".leaflet-control.leaflet-bar, #sceneNav").css("opacity", v || 0);
			$("#textbox").css("bottom", `${v ? "58" : "10"}px`);
		};
	$(window).on("mousemove touchmove", function() {
		btnToggle(0.8); clearTimeout(btnTimer);
		btnTimer = setTimeout(btnToggle, 5000);
	});
	setTimeout(btnToggle, 5000);



	_SCENES = new Scenes();

	$(document).keydown(ev => { if(["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", "Space"].indexOf(ev.code) > -1) { ev.preventDefault(); } });
	$(document).keyup(ev => {
		let keycode = ev.code;

		if(["ArrowUp","ArrowLeft"].indexOf(keycode) > -1) { ev.preventDefault(); _SCENES.prev(); }
		if(["ArrowDown", "ArrowRight", "Space"].indexOf(keycode) > -1) { ev.preventDefault(); _SCENES.next(); }
		if(["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", "Space"].indexOf(keycode) > -1) { ev.preventDefault(); }
	});

	_TEXTBOXES = new Textboxes();

	_MAP = L.map("map", {
		center: [ 50, 6 ],
		zoom: window.innerWidth < 575.98 ? 3 : 5,
		zoomControl: false,
		maxZoom: 18,
		doubleClickZoom: false,
		zoomAnimationThreshold: 100,
		wheelPxPerZoomLevel: 1500,
		keyboard: false,
		tap: false,
		boxZoom: false,
		//touchZoom: false,
		//worldCopyJump: true

		contextmenu: true,
		contextmenuItems: [
			{ text: "Copy coordinates", callback: ev => { navigator.clipboard.writeText( `${ev.latlng.lat}, ${ev.latlng.lng}` ); } },
			{ text: "Center map here", callback: ev => { _MAP.panTo(ev.latlng); } },
			"-",
			{ text: "Zoom in", icon: "assets/zoom-in.png", callback: ev => { _MAP.zoomIn(); } },
			{ text: "Zoom out", icon: "assets/zoom-out.png", callback: ev => { _MAP.zoomOut(); } }
		]
	});

	document.addEventListener("_setup", ev => { _MAP.setup(); _TEXTBOXES.setup(); _SCENES.setup(); });
	document.addEventListener("_reset", ev => { _SCENES.reset(); _TEXTBOXES.reset(); _MAP.reset(); });



	// Load data
	$("#loadingModal").modal("show");
	$.ajax({
		type: "GET",
		url: "api/map_read.php",
		data: { "id": _ID, "password": "" },
		dataType: "json",
		success: function(result, status, xhr) {
			if(result.data) { import_data( JSON.parse(result.data) ); }

			setTimeout(function() { $("#loadingModal").modal("hide"); }, 750);
		},
		error: function(xhr, status, error) {
			console.log(xhr.status, error);

			if(xhr.status == 401) { setTimeout(function() { $("#loadingModal").modal("hide"); $("#passwordModal").modal("show"); }, 750); }
			else{ setTimeout(function() { $("#loadingModal").modal("hide"); $("#errorModal").modal("show"); }, 750); }
		}
	});

	$("#passwordModal button#enter").click(ev => {
		let password = $("#passwordModal input#passwordInput").val();
		password = password === "" ? password : sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash( password ));
		_PASSWORD = password;

		$("#passwordModal").modal("hide");
		$("#loadingModal").modal("show");

		$.ajax({
			type: "GET",
			url: "api/map_read.php",
			data: { "id": _ID, "password": password },
			dataType: "json",
			success: function(result, status, xhr) {
				if(result.data) { import_data( JSON.parse(result.data) ); }

				setTimeout(function() { $("#loadingModal").modal("hide"); }, 750);
			},
			error: function(xhr, status, error) {
				console.log(xhr.status, error);
				setTimeout(function() { $("#loadingModal").modal("hide"); $("#errorModal").modal("show"); }, 750);
			}
		});
	});

};
