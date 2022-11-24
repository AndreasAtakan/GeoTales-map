/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";

import { generate_basemaps } from "./generate.js";


export function uuid(a) {
	return a ? (a^Math.random()*16>>a/4).toString(16) : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, uuid);
}



export function sanitize(str) {
	let map = {
		"\&": "&amp;",
		"\<": "&lt;",
		"\>": "&gt;",
		"\"": "&quot;",
		"\'": "&#x27;",
		"\/": "&#x2F;"
	};
	let reg = /[&<>"'/]/ig;
	return str.replace(reg, match => (map[match]));
}



function import_project(data) {
	_OPTIONS = data.options;
	$("#optionsModal input#animationSpeed").val(_OPTIONS.animationspeed / 1000);
	$("#optionsModal input#panningSpeed").val(_OPTIONS.panningspeed || null);
	$("#optionsModal input#objectsOptIn").prop("checked", _OPTIONS.objectOptIn);

	if(data.scenes.length <= 0) { return; }

	if(_SCENES.store.length <= 0) { document.dispatchEvent( new Event("_setup") ); }

	_SCENES.importData(data.scenes);
	_TEXTBOXES.importData(data.textboxes);
	_MAP.importData(data.objects);

	_SCENES.current();
}
function import_geojson(data, options) {
	for(let f of data.features) {
		let o;
		let t = a => {
			if(Array.isArray(a[0])) { for(let v of a) { t(v); } }
			else{ a.reverse(); }
		};
		let pos = f.geometry.coordinates; t(pos);

		if(f.properties.type == "avatar") {
			o = {
				id:					uuid(),
				sceneId:			_SCENES.active,
				type:				"avatar",
				pos:				pos,
				label:				f.properties.label,
				icon:				f.properties.icon,
				ratio:				f.properties.ratio,
				rounded:			f.properties.rounded,
				angle:				f.properties.angle,
				borderColor:		f.properties.borderColor,
				borderThickness:	f.properties.borderThickness,
				blur:				f.properties.overlayBlur,
				grayscale:			f.properties.overlayGrayscale,
				brightness:			f.properties.overlayBrightness,
				transparency:		f.properties.overlayTransparency
			};
		}else
		if(f.properties.type == "polyline"
		|| f.geometry.type == "LineString"
		|| f.geometry.type == "MultiLineString") {
			o = {
				id:				uuid(),
				sceneId:		_SCENES.active,
				type:			"polyline",
				pos:			pos,
				label:			f.properties.label,
				dashed:			f.properties.dashed,
				color:			f.properties.color || options.lineColor,
				thickness:		f.properties.thickness || options.lineThickness,
				transparency:	f.properties.transparency || options.lineTransparency
			};
		}else
		if(f.properties.type == "polygon"
		|| f.properties.type == "rectangle"
		|| f.geometry.type == "Polygon"
		|| f.geometry.type == "MultiPolygon") {
			o = {
				id:					uuid(),
				sceneId:			_SCENES.active,
				type:				"polygon",
				pos:				pos,
				label:				f.properties.label,
				dashed:				f.properties.dashed,
				lineColor:			f.properties.lineColor || options.lineColor,
				lineThickness:		f.properties.lineThickness || options.lineThickness,
				lineTransparency:	f.properties.lineTransparency || options.lineTransparency,
				fillColor:			f.properties.fillColor || options.fillColor,
				fillTransparency:	f.properties.fillTransparency || options.fillTransparency
			};
		}else
		if(f.properties.type == "circle"
		|| f.geometry.type == "Point") {
			o = {
				id:					uuid(),
				sceneId:			_SCENES.active,
				type:				"circle",
				pos:				pos,
				radius:				f.properties.radius || 4000 * (_MAP.getMaxZoom() - _MAP.getZoom()),
				label:				f.properties.label,
				dashed:				f.properties.dashed,
				lineColor:			f.properties.lineColor || options.lineColor,
				lineThickness:		f.properties.lineThickness || options.lineThickness,
				lineTransparency:	f.properties.lineTransparency || options.lineTransparency,
				fillColor:			f.properties.fillColor || options.fillColor,
				fillTransparency:	f.properties.fillTransparency || options.fillTransparency
			};
		}
		else{ continue; }

		let object = _MAP.createObject(o);
		_MAP.addLayer( object );
		_MAP.fire("_addedlayer", { layer: object });
		_MAP.objects.push( _MAP.extractObject(object) );
	}
}
function import_gedcom(data, options) {
	//
}
export function import_data(type, data, options) {
	switch(type) {
		case "project": import_project(data); break;
		case "geojson": import_geojson(data, options); break;
		case "gedcom": import_gedcom(data, options); break;
		default: console.error("data-import type invalid"); break;
	}
}


function export_project() {
	return JSON.stringify({
		options: _OPTIONS,
		scenes: _SCENES.exportData(),
		textboxes: _TEXTBOXES.exportData(),
		objects: _MAP.exportData()
	});
}
function export_geojson() {
	let r = [];
	for(let o of _MAP.getLayers()) { r.push( o.__toGeoJSON() ); }
	return JSON.stringify({
		"type": "FeatureCollection",
		"features": r
	});
}
let running = false;
export function export_data(type) {
	if(running) { return; } running = true;

	let el = document.createElement("a");

	let f = v => v < 10 && v >= 0 ? `0${v}` : `${v}`;
	let date = new Date();
	let y = date.getFullYear(), m = f(date.getMonth() + 1), d = f(date.getDate()), H = f(date.getHours()), M = f(date.getMinutes()), S = f(date.getSeconds());
	let filename = `${_TITLE} - ${y}.${m}.${d} - ${H}.${M}.${S}`;

	let data;
	switch(type) {
		case "project":
			filename += ".geotales";
			data = "data:application/json;charset=utf-8," + encodeURIComponent( export_project() );
			break;

		case "geojson":
			filename += ".geojson";
			data = "data:application/geo+json;charset=utf-8," + encodeURIComponent( export_geojson() );
			break;

		default: return;
	}

	el.setAttribute("href", data);
	el.setAttribute("download", filename);
	el.style.display = "none";

	document.body.appendChild(el);
	$(el).ready(() => { el.click(); document.body.removeChild(el); running = false; });
}

export function save_data(callback) {
	$.ajax({
		type: "POST",
		url: "api/map_write.php",
		data: {
			"id": _ID,
			"data": export_project(),
			"preview": _MAP.getCenterBasemapTile()
		},
		dataType: "json",
		success: function(result, status, xhr) {
			saved_changes();
			setTimeout(function() { if(callback) { callback(); } }, 750);
		},
		error: function(xhr, status, error) {
			console.error(xhr.status, error);
			setTimeout(function() { $("#loadingModal").modal("hide"); $("#errorModal").modal("show"); }, 750);
		}
	});
}



export function unsaved_changes() {
	$(window).off("beforeunload");
	$(window).on("beforeunload", ev => {
		ev.preventDefault();

		let m = "Unsaved changes could be lost. Are you sure you want to close?";
		ev.returnValue = m;
		return m;
	});
}

export function saved_changes() {
	$(window).off("beforeunload");
}



export function flash_map() {
	$("div#map").addClass("snapshot");
	setTimeout(function() { $("div#map").removeClass("snapshot"); }, 240);
}



export function get_basemap(url) {
	for(let b of _BASEMAPS) {
		if(b.tiles._url == url) { return b; }
	}
	return null;
}

function bind_basemaps() {
	$("#basemapModal #basemaps").off("click");
	$("#basemapModal #basemaps").click(async function(ev) {
		let index = $(ev.target).data("basemap");
		if(!index && index !== 0) { return; }

		await _MAP.setBasemap( _BASEMAPS[index].tiles );
		_SCENES.setBasemap();
	});

	$("#basemapModal button#uploadBasemap").click(function(ev) {
		$("#basemapModal input#basemapFile").click();
	});
}
export function init_basemaps() {
	generate_basemaps(false); bind_basemaps();
}
export function init_img_basemaps() {
	generate_basemaps(true); bind_basemaps();
}



export function get_aspect_ratio_dimentions(w, h, r) {
	let _w = r * h;
	if(_w <= w) {
		return [_w, h];
	}else{
		return [w, w / r];
	}
}
