/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";

import {
	import_data,
	export_data,
	save_data,
	unsaved_changes,
	init_basemaps
} from "./helpers.js";

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
	}).on("resizeend", function() { _MAP.setAspectRatio(); });



	_SCENES = new Scenes();

	$("#sceneRow").keydown(ev => { if(["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", "Space"].indexOf(ev.code) > -1) { ev.preventDefault(); } });
	$("#sceneRow").keyup(ev => {
		let keycode = ev.code;
		if(keycode == "ArrowLeft") { ev.preventDefault(); _SCENES.prev(); }
		if(keycode == "ArrowRight") { ev.preventDefault(); _SCENES.next(); }
		if(["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", "Space"].indexOf(keycode) > -1) { ev.preventDefault(); }
	});

	$("#sceneRow button#add").click(ev => { _SCENES.add(); });
	$("#sceneRow button#recapture").click(ev => { _SCENES.capture(); });
	$("#sceneWarningModal button#delete").click(ev => { _SCENES.delete(); $("#sceneWarningModal").modal("hide"); });


	_TEXTBOXES = new Textboxes();


	_MAP = L.map("map", {
		center: [ 49, 14 ],
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

	document.addEventListener("_setup", ev => {
		_MAP.setup(); _TEXTBOXES.setup(); _SCENES.setup();
	});
	document.addEventListener("_reset", ev => {
		_SCENES.reset(); _TEXTBOXES.reset(); _MAP.reset();
	});



	$("#optionsModal input#animationSpeed").change(function(ev) { _OPTIONS.animationspeed = $(this).val() * 1000; });
	$("#optionsModal input#panningSpeed").change(function(ev) { _OPTIONS.panningspeed = $(this).val() || null; });
	$("#optionsModal select#aspectRatio").change(function(ev) { _MAP.setAspectRatio( eval( this.value ) ); });
	$("#optionsModal input#objectsOptIn").change(function(ev) { _OPTIONS.objectOptIn = this.checked; });



	init_basemaps();

	$("#basemapModal input#basemapFile").change(ev => {
		let file = $(ev.target)[0].files[0];
		if(!file) { return; }

		$("#loadingModal").modal("show");

		let data = new FormData();
		data.append("type", "basemap");
		data.append("image", file);

		$.ajax({
			type: "POST",
			url: "api/upload_create.php",
			data: data,
			contentType: false,
			processData: false,
			success: async function(result, status, xhr) {
				await _MAP.setBasemap({ type: "image", img: result });
				_SCENES.setBasemap();
				_BASEMAPS.push({
					name: "",
					tiles: { type: "image", img: result },
					preview: result
				});
				setTimeout(function() { $("#loadingModal").modal("hide"); }, 750);
			},
			error: function(xhr, status, error) {
				console.error(xhr.status, error);
				setTimeout(function() { $("#loadingModal").modal("hide"); $("#errorModal").modal("show"); }, 750);
			}
		});
	});

	$("#basemapModal button#basemapFetch").click(ev => {
		let url = $("#basemapModal input#basemapLink").val();
		if(!url) { return; }

		let protocol = url.split(/\:/ig)[0];
		if(protocol == "mapbox") {
			let username = url.split(/mapbox\:\/\/styles\//ig)[1].split(/\//ig)[0], styleID = url.split(/mapbox\:\/\/styles\//ig)[1].split(/\//ig)[1],
				key = $("#basemapModal input#basemapKey").val();
			if(!key) { return; }

			url = `https://api.mapbox.com/styles/v1/${username}/${styleID}/tiles/256/{z}/{x}/{y}?access_token=${key}`;
		}

		_MAP.setBasemap({ type: "tiles", url: url });
		_SCENES.setBasemap();
	});

	$("#basemapModal button#wmsAdd").click(ev => {
		let url = $("#basemapModal input#wmsLink").val(),
			layers = $("#basemapModal input#wmsLayer").val(),
			format = $("#basemapModal select#wmsFormat").val(),
			version = $("#basemapModal select#wmsVersion").val();
		if(!url || !layers) { return; }

		_MAP.setWMS({
			type: "wms",
			url: url,
			layers: layers,
			format: format,
			version: version,
			transparent: format == "image/png"
		});
		_SCENES.setWMS();
	});
	$("#basemapModal button#wmsRemove").click(ev => {
		_MAP.setWMS(null);
		_SCENES.setWMS();
	});



	$("#projectFileInput").change(ev => {
		let file = $(ev.target)[0].files[0];
		if(!file) { return; }

		let fr = new FileReader();
		fr.onload = function() { import_data( "project", JSON.parse( fr.result ) ); };
		fr.readAsText(file);
	});
	$("#geojsonImportModal button#import").click(ev => {
		$("#geojsonImportModal").modal("hide");

		let file = $("#geojsonImportModal input#fileInput")[0].files[0];
		if(!file) { return; }

		let options = {
			lineColor: $("#geojsonImportModal #lineColor").val(),
			lineThickness: $("#geojsonImportModal #lineThickness").val() || 3,
			lineTransparency: $("#geojsonImportModal #lineTransparency").val(),
			fillColor: $("#geojsonImportModal #fillColor").val(),
			fillTransparency: $("#geojsonImportModal #fillTransparency").val() || 0.8
		};

		let fr = new FileReader();
		fr.onload = function() { import_data( "geojson", JSON.parse( fr.result ), options ); };
		fr.readAsText(file);
	});
	$("#gedcomImportModal button#import").click(ev => {
		$("#gedcomImportModal").modal("hide");

		let file = $("#gedcomImportModal input#fileInput")[0].files[0];
		if(!file) { return; }

		let options = {};

		let fr = new FileReader();
		fr.onload = function() { import_data( "gedcom", fr.result, options ); };
		fr.readAsText(file);
	});


	$("button#export").click(ev => {
		export_data( $(ev.target).data("type") || null );
	});

	$("a#save").click(ev => {
		$("#loadingModal").modal("show");
		save_data(function() { $("#loadingModal").modal("hide"); });
	});
	setInterval(save_data, 5 * 60 * 1000);


	$("#loadingModal").modal("show");
	$.ajax({
		type: "GET",
		url: "api/map_read.php",
		data: { "id": _ID, "password": "" },
		dataType: "json",
		success: function(result, status, xhr) {
			if(result.data) { import_data( "project", JSON.parse(result.data) ); }
			$(`div#sceneRow,
			   div#mapRow,
			   .navbar .navbarContent li`).click(ev => { unsaved_changes(); });

			setTimeout(function() { $("#loadingModal").modal("hide"); }, 750);
		},
		error: function(xhr, status, error) {
			console.error(xhr.status, error);
			setTimeout(function() { $("#loadingModal").modal("hide"); $("#errorModal").modal("show"); }, 750);
		}
	});

	$.ajax({
		type: "GET",
		url: "api/upload_get.php",
		//data: {},
		dataType: "json",
		success: function(result, status, xhr) {
			for(let r of result) {
				if(r.type == "icon") { _ICONS.unshift(r.ref); }
				else
				if(r.type == "basemap") {
					_BASEMAPS.push({
						name: "",
						tiles: { type: "image", img: r.ref },
						preview: r.ref
					});
				}
			}
		},
		error: function(xhr, status, error) {
			console.error(xhr.status, error);
		}
	});

};
