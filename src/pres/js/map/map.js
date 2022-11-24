/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";

import { get_aspect_ratio_dimentions } from "../helpers.js";
import "./layers.js";


L.Map.addInitHook(function() {

	// Init map aspect ratio

	this.setAspectRatio();



	// Plugins

	/*this.addControl( new L.Control.Fullscreen({ position: "topright" }) );*/

	/*this.addControl( L.control.zoom({ position: "bottomright" }) );*/

	/*this.addControl( L.control.locate({ position: "topright" }) );*/

	this.fullscreenControl = L.easyButton({
		id: "fullscreen",
		position: "bottomcenter",
		states: [
			{
				stateName: "enter", title: "Enter fullscreen", icon: "fa-expand",
				onClick: (button, map) => {
					if(_IS_MOBILE) { window.parent.postMessage("fullscreenEnter", "*"); }
					else{
						let el = document.body;
						if(el.requestFullscreen) { el.requestFullscreen(); }
						else if(el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); } /* Safari */
						else if(el.msRequestFullscreen) { el.msRequestFullscreen(); } /* IE11 */
					}

					this.isFullscreen = true;
					this.setAspectRatio();
					button.state("exit");
				}
			},
			{
				stateName: "exit", title: "Exit fullscreen", icon: "fa-compress",
				onClick: (button, map) => {
					if(_IS_MOBILE) { window.parent.postMessage("fullscreenExit", "*"); }
					else{
						if(document.exitFullscreen) { document.exitFullscreen(); }
						else if(document.webkitExitFullscreen) { document.webkitExitFullscreen(); } /* Safari */
						else if(document.msExitFullscreen) { document.msExitFullscreen(); } /* IE11 */
					}

					this.isFullscreen = false;
					this.setAspectRatio();
					button.state("enter");
				}
			}
		]
	});
	this.addControl(this.fullscreenControl);

	this.zoomControl = L.easyBar([
		L.easyButton({
			id: "zoomIn",
			states: [
				{
					stateName: "main", title: "Zoom in", icon: "fa-plus",
					onClick: (button, map) => { this.zoomIn(); }
				}
			]
		}),
		L.easyButton({
			id: "mapLock",
			states: [
				{
					stateName: "locked", title: "Unlock map", icon: "fa-lock",
					onClick: (button, map) => {
						this.isLocked = false; this.enable();
						button.state("unlocked");
					}
				},
				{
					stateName: "unlocked", title: "Lock map", icon: "fa-lock-open",
					onClick: (button, map) => {
						this.isLocked = true; this.disable();
						this.fitBounds( _SCENES.get( _SCENES.active ).bounds, { maxZoom: this.getMaxZoom(), noMoveStart: true } );
						button.state("locked");
					}
				}
			]
		}),
		L.easyButton({
			id: "zoomOut",
			states: [
				{
					stateName: "main", title: "Zoom out", icon: "fa-minus",
					onClick: (button, map) => { this.zoomOut(); }
				}
			]
		})
	], { position: "bottomright" });
	this.addControl(this.zoomControl);

	this.isFullscreen = false;
	this.isLocked = true;





	// Basemap

	this.basemap = _BASEMAPS[10].tiles;
	this.addLayer( this.basemap );

	// WMS

	this.wms = {};





	// Object layers

	this.objects = [];
	this.objectLayer = L.featureGroup();
	this.addLayer( this.objectLayer );

	this.objectLayer.on("layeradd", ev => {
		let o = ev.layer;

		let label = o.options.label;
		if(label) {
			o.bindTooltip(label, { direction: "center", permanent: true });
			if(o instanceof L.ImageOverlay) { this.updateTooltip(o); }
		}

		o.on("moveend", ev => { this.updateTooltip(ev.target); });

		if(o instanceof L.ImageOverlay) { this.setIcon(o); }
	});

	this.objectLayer.on("layerremove", ev => {
		let o = ev.layer;

		o.closeTooltip(); o.unbindTooltip();
		o.slideCancel();
	});

	this.on("zoomend", ev => {
		for(let o of this.getLayers()) { this.updateTooltip(o); }
	});
	this.on("zoom", ev => { if(this._renderer) { this._renderer._reset(); } });





	// Map events
	//this.on("moveend", ev => {});

});




L.Map.include({

	setup: function() {
		$(".leaflet-control-attribution>span").before("<span aria-hidden=\"true\">|</span> <a href=\"https://geotales.io\">GeoTales</a> ");
		$(".leaflet-control-attribution a").prop("target", "_blank");

		$("#mapNav #zoomIn").click(ev => { this.zoomIn(); });
		$("#mapNav #zoomOut").click(ev => { this.zoomOut(); });

		this.disable();
	},
	reset: function() {
		this.clearLayers();
	},

	enable: function() {
		this.dragging.enable();
		this.scrollWheelZoom.enable();
		this.touchZoom.enable();
		if(this.tapHold) { this.tapHold.enable(); }

		//this.doubleClickZoom.disable();

		this.zoomControl._buttons[0].enable();
		this.zoomControl._buttons[2].enable();
	},
	disable: function() {
		this.dragging.disable();
		this.scrollWheelZoom.disable();
		this.touchZoom.disable();
		if(this.tapHold) { this.tapHold.disable(); }

		this.doubleClickZoom.disable();

		this.zoomControl._buttons[0].disable();
		this.zoomControl._buttons[2].disable();
	},

	setOrientation: function(pos) {
		switch(pos) {
			case "left":
				this.zoomControl.setPosition("bottomleft");
				break;

			case "right":
				this.zoomControl.setPosition("bottomright");
				break;

			default: break;
		}
	},

	setAspectRatio: function() {
		let w = $("#main").outerWidth(),
			h = $("#main").outerHeight(),
			r = _OPTIONS.aspectratio;
		let dim = get_aspect_ratio_dimentions(w, h, r);

		let width = (dim[0] / w) * 100,
			height = (dim[1] / h) * 100,
			left = (((w - dim[0]) / 2) / w) * 100,
			top = (((h - dim[1]) / 2)/ h) * 100;

		if(this.isFullscreen) {
			width = 100; height = 100;
			left = 0; top = 0;
		}

		$("#map").css({
			width: `${width}%`,
			height: `${height}%`,
			left: `${left}%`,
			top: `${top}%`
		});

		this.invalidateSize();
		if(_SCENES.active) { this.setFlyTo( _SCENES.get( _SCENES.active ).bounds ); }

		let mh = $("#map").height(), isSmall = w <= 575.98 && h > 450;
		if(mh >= h && isSmall) { $(".leaflet-bottom.leaflet-center .leaflet-bar").addClass("marginBottom"); }
		else { $(".leaflet-bottom.leaflet-center .leaflet-bar").removeClass("marginBottom"); }
	},

	setFlyTo: function(bounds) {
		if(this.isLocked) {
			this.flyToBounds(bounds, { maxZoom: this.getMaxZoom(), noMoveStart: true, duration: _OPTIONS.panningspeed || null });
		}
	},



	clearLayers: function() {
		this.objectLayer.clearLayers();
	},

	getLayers: function() {
		return this.objectLayer.getLayers();
	},

	setObjects: function(sceneId) {
		let os = this.getLayers().map(o => {
			let r = this.extractObject(o); return { id: r.id, pos: r.pos, radius: r.radius, animationspeed: r.animationspeed };
		});
		this.clearLayers();
		for(let i = 0; i < this.objects.length; i++) {
			let o = Object.assign({}, this.objects[i]);
			if(o.sceneId == sceneId) {
				let pos = o.pos, rad = o.radius;
				for(let oo of os) {
					if(o.id == oo.id) {
						o.pos = oo.pos;
						if(o.type == "circle") { o.radius = oo.radius; }
						break;
					}
				}

				let object = this.createObject(o);
				this.objectLayer.addLayer(object);

				for(let oo of os) {
					if(o.id == oo.id) {
						object.slideTo( pos , { radius: rad, duration: oo.animationspeed || _OPTIONS.animationspeed });
						break;
					}
				}
			}
		}
	},

	set: function(sceneId) {
		let s = _SCENES.get(sceneId);
		this.setBasemap(s.basemap);
		this.setWMS(s.wms);
		this.setObjects(sceneId);
		this.setFlyTo(s.bounds);
	},

	setIcon: function(o, size, icon) {
		if(!(o instanceof L.ImageOverlay)) { return; }

		if(size) {
			let zoom = this.getZoom();
			let c = this.project(o.getBounds().getCenter(), zoom);
			o.setBounds([
				this.unproject([ c.x - size[0] / 2, c.y - size[1] / 2 ], zoom),
				this.unproject([ c.x + size[0] / 2, c.y + size[1] / 2 ], zoom)
			]);
		}
		if(icon) { o.setUrl(icon); }

		$(o._image).css("border-radius", o.options.rounded ? "50%" : "0");
		//$(o._image).css("transform", `rotate(${o.options.angle}deg)`);
		$(o._image).css("border", `${o.options.borderThickness}px solid ${o.options.borderColor}`);
		$(o._image).css("filter", `
			blur(${o.options.overlayBlur}px)
			grayscale(${o.options.overlayGrayscale*100}%)
			drop-shadow(0 0 ${o.options.overlayBrightness}px yellow)
			opacity(${(1 - o.options.overlayTransparency)*100}%)
		`);

		if(o.options.label) { this.updateTooltip(o); }
	},

	updateTooltip: function(o) {
		if(o.getTooltip()) {
			o.closeTooltip();
			if(o instanceof L.ImageOverlay) {
				let d = this.latLngToContainerPoint( o.getBounds().getNorthWest() ).distanceTo( this.latLngToContainerPoint( o.getBounds().getSouthWest() ) );
				o.getTooltip().options.offset = [0, d / 2 - 10];
			}
			o.openTooltip();
		}
	},



	getWMS: function() {
		return this.wms ? {
			type: "wms",
			url: this.wms._url,
			layers: this.wms.options.layers,
			format: this.wms.options.format,
			version: this.wms.options.version,
			transparent: this.wms.options.transparent
		} : null;
	},

	setWMS: function(source) {
		if(!source) {
			this.wms = this.wms ? this.removeLayer( this.wms ) : null;
			return;
		}
		if(this.wms
		&& (source.url || source._url) == this.wms._url
		&& (source.layers || source.options.layers) == this.wms.options.layers
		&& (source.format || source.options.format) == this.wms.options.format
		&& (source.version || source.options.version) == this.wms.options.version) {
			return;
		}

		let layer;

		if(source instanceof L.TileLayer.WMS) {
			layer = source;
		}else
		if(source.type == "wms") {
			layer = L.tileLayer.wms(source.url, {
				layers: source.layers,
				format: source.format,
				transparent: source.transparent,
				version: source.version,
				minZoom: source.minZoom || 0,
				maxZoom: source.maxZoom || 22,
				attribution: source.attribution || ""
			});
		}
		else{ return; }

		if(this.wms) { this.removeLayer( this.wms ); }

		this.wms = layer;

		this.addLayer( this.wms );
		this.wms.bringToFront();
	},

	getBasemap: function() {
		if(this.basemap instanceof L.TileLayer) {
			return {
				type: "tiles",
				url: this.basemap._url,
				minZoom: this.basemap.options.minZoom,
				maxZoom: this.basemap.options.maxZoom,
				attribution: this.basemap.options.attribution
			};
		}else
		if(this.basemap instanceof L.ImageOverlay) {
			return {
				type: "image",
				img: this.basemap._url
			};
		}
		return null;
	},

	setBasemap: async function(source) {
		let basemap;

		if(source instanceof L.TileLayer) {
			if(this.basemap instanceof L.TileLayer
			&& source._url == this.basemap._url) { return; }

			basemap = source;
		}else
		if(source.type == "tiles") {
			if(this.basemap instanceof L.TileLayer
			&& source.url == this.basemap._url) { return; }

			basemap = L.tileLayer(source.url, {
				minZoom: source.minZoom || 0,
				maxZoom: source.maxZoom || 22,
				attribution: source.attribution || "&copy;"
			});
		}else
		if(source.type == "image") {
			if(this.basemap instanceof L.ImageOverlay
			&& source.img == this.basemap._url) { return; }

			let img = new Image();
			img.src = source.img;
			await img.decode();

			let r = img.width / img.height;
			let b = _SCENES.get( _SCENES.active ).bounds;
			let bounds = [b[0], []];
			let tlp = this.latLngToContainerPoint(b[0]),
				brp = this.latLngToContainerPoint(b[1]);
			let h = brp.y - tlp.y,
				w = brp.x - tlp.x;

			if(r >= 1) { // width >= height
				let p = this.containerPointToLatLng([brp.x, tlp.y + w / r]);
				bounds[1][0] = p.lat;
				bounds[1][1] = p.lng;
			}else{ // height > width
				let p = this.containerPointToLatLng([tlp.x + r * h, brp.y]);
				bounds[1][0] = p.lat;
				bounds[1][1] = p.lng;
			}

			basemap = L.imageOverlay(source.img, bounds, {
				zIndex: 0,
				minZoom: 0, maxZoom: 1000,
				attribution: "&copy;"
			});
		}
		else{ return; }

		this.removeLayer( this.basemap );

		this.basemap = basemap;

		this.presetZoom(this.basemap.options.minZoom, this.basemap.options.maxZoom);

		this.addLayer( this.basemap );
		this.basemap.bringToBack();

		$("div.leaflet-control-attribution a").prop("target", "_blank");
	},

	resetBasemap: function() { this.setBasemap( _BASEMAPS[10].tiles ); },

	presetZoom: function(min, max) {
		let zoom = this.getZoom();
		if(zoom < min || zoom > max) {
			if(zoom < min) { this.setZoom(min); }
			if(zoom > max) { this.setZoom(max); }
		}
		this.setMinZoom(min);
		this.setMaxZoom(max);
	},



	createObject: function(o) {
		let oo = null;

		switch(o.type) {
			case "avatar":
				oo = L.imageOverlay(o.icon, o.pos, {
					interactive:			false,
					zIndex:					200,
					label:					o.label,
					ratio:					o.ratio,
					rounded:				o.rounded,
					angle:					o.angle,
					borderColor:			o.borderColor,
					borderThickness:		o.borderThickness,
					overlayBlur:			o.blur,
					overlayBrightness:		o.brightness,
					overlayGrayscale:		o.grayscale,
					overlayTransparency:	o.transparency
				});
				break;

			case "polyline":
				oo = L.polyline(o.pos, {
					interactive:	false,
					label:			o.label,
					dashArray:		o.dashed ? "5, 10" : "",
					color:			o.color,
					weight:			o.thickness,
					opacity:		1 - o.transparency
				});
				break;

			case "polygon":
				oo = L.polygon(o.pos, {
					interactive:	false,
					label:			o.label,
					dashArray:		o.dashed ? "5, 10" : "",
					color:			o.lineColor,
					weight:			o.lineThickness,
					opacity:		1 - o.lineTransparency,
					fillColor:		o.fillColor,
					fillOpacity:	1 - o.fillTransparency
				});
				break;

			case "rectangle":
				oo = L.rectangle(o.pos, {
					interactive:	false,
					label:			o.label,
					dashArray:		o.dashed ? "5, 10" : "",
					color:			o.lineColor,
					weight:			o.lineThickness,
					opacity:		1 - o.lineTransparency,
					fillColor:		o.fillColor,
					fillOpacity:	1 - o.fillTransparency
				});
				break;

			case "circle":
				oo = L.circle(o.pos, {
					interactive:	false,
					radius:			o.radius,
					label:			o.label,
					dashArray:		o.dashed ? "5, 10" : "",
					color:			o.lineColor,
					weight:			o.lineThickness,
					opacity:		1 - o.lineTransparency,
					fillColor:		o.fillColor,
					fillOpacity:	1 - o.fillTransparency
				});
				break;

			default:
				console.error("object type invalid");
				break;
		}

		oo.options.id = o.id;
		oo.options.sceneId = o.sceneId;

		return oo;
	},

	extractObject: function(o) {
		let oo = null;

		if(o instanceof L.ImageOverlay) {
			let nw = o.getBounds().getNorthWest(), se = o.getBounds().getSouthEast();
			oo = {
				id:					o.options.id,
				sceneId:			o.options.sceneId,
				type:				"avatar",
				pos:				[[nw.lat, nw.lng], [se.lat, se.lng]],
				label:				o.options.label,
				icon:				o._url,
				ratio:				o.options.ratio,
				rounded:			o.options.rounded,
				angle:				0,
				borderColor:		o.options.borderColor,
				borderThickness:	o.options.borderThickness,
				blur:				o.options.overlayBlur,
				grayscale:			o.options.overlayGrayscale,
				brightness:			o.options.overlayBrightness,
				transparency:		o.options.overlayTransparency,
				animationspeed:		o.options.animationspeed
			};
		}else
		if(o instanceof L.Polygon) {
			oo = {
				id:					o.options.id,
				sceneId:			o.options.sceneId,
				type:				o instanceof L.Rectangle ? "rectangle" : "polygon",
				pos:				o.getLatLngs(),
				label:				o.options.label,
				dashed:				!!o.options.dashArray,
				lineColor:			o.options.color,
				lineThickness:		o.options.weight,
				lineTransparency:	1 - o.options.opacity,
				fillColor:			o.options.fillColor,
				fillTransparency:	1 - o.options.fillOpacity,
				animationspeed:		o.options.animationspeed
			};
		}else
		if(o instanceof L.Polyline) {
			oo = {
				id:				o.options.id,
				sceneId:		o.options.sceneId,
				type:			"polyline",
				pos:			o.getLatLngs(),
				label:			o.options.label,
				dashed:			!!o.options.dashArray,
				color:			o.options.color,
				thickness:		o.options.weight,
				transparency:	1 - o.options.opacity,
				animationspeed:	o.options.animationspeed
			};
		}else
		if(o instanceof L.Circle) {
			let p = o.getLatLng();
			oo = {
				id:					o.options.id,
				sceneId:			o.options.sceneId,
				type:				"circle",
				pos:				[ p.lat, p.lng ],
				radius:				o.getRadius(),
				label:				o.options.label,
				dashed:				!!o.options.dashArray,
				lineColor:			o.options.color,
				lineThickness:		o.options.weight,
				lineTransparency:	1 - o.options.opacity,
				fillColor:			o.options.fillColor,
				fillTransparency:	1 - o.options.fillOpacity,
				animationspeed:		o.options.animationspeed
			};
		}else{ console.error("object type invalid"); }

		return oo;
	},

	importData: function(data) {
		for(let i = 0; i < data.length; i++) {
			this.objects.push( data[i] );
		}
	}

});
