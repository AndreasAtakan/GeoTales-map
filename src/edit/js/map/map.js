/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";

import { uuid, save_data, get_aspect_ratio_dimentions, init_img_basemaps } from "../helpers.js";
import { avatar_popup, polyline_popup, polygon_popup } from "../generate.js";
import { bind_setup } from "./layers.js";


L.Map.addInitHook(function() {

	// Init map aspect ratio

	this.setAspectRatio();



	// Plugins

	/*this.addControl( new L.Control.Fullscreen({ position: "topright" }) );*/

	/*this.addControl( L.control.zoom({ position: "bottomright" }) );*/

	this.returnButton = L.Control.zoomHome({
		position: "bottomright",
		zoomHomeIcon: "home",
		zoomHomeTitle: "Return to map-extent"
	});
	this.addControl( this.returnButton );

	this.basemapButton = L.easyButton({
		id: "changeBasemap",
		position: "bottomright",
		leafletClasses: true,
		states: [
			{
				stateName: "main",
				onClick: function(button, map) { $("#basemapModal").modal("show"); init_img_basemaps(); },
				title: "Change basemap",
				icon: "fa-layer-group"
			}
		]
	});
	this.addControl( this.basemapButton );
	this.basemapButton.disable();

	this.textboxButton = L.easyButton({
		id: "addTextbox",
		position: "topleft",
		leafletClasses: true,
		states: [
			{
				stateName: "main",
				onClick: function(button, map) { _TEXTBOXES.add(); },
				title: "Add book",
				icon: "fa-comment-alt"
			}
		]
	});
	this.addControl( this.textboxButton );
	this.textboxButton.disable();

	/*this.addControl( L.control.locate({ position: "topright" }) );*/





	// Basemap

	this.basemap = _BASEMAPS[10].tiles;
	this.addLayer( this.basemap );

	// WMS

	this.wms = {};





	// Draw and edit control

	//L.PM.setOptIn(true);
	this.pm.addControls({
		position: "topright",
		drawCircleMarker: false,
		drawText: false,
		oneBlock: true
	});
	this.pm.setPathOptions({
		weight: 3,
		color: "#563d7c",
		opacity: 1,
		fillColor: "#563d7c",
		fillOpacity: 0.2
	});
	this.pm.setGlobalOptions({
		markerStyle: {
			icon: L.icon({ iconUrl: "assets/user-circle-solid.svg", iconSize: [30, 30], popupAnchor: [0, -15], tooltipAnchor: [0, 15] })
		}
	});
	this.pm.setLang("customLang", {
		tooltips: { placeMarker: "Click to place avatar" },
		buttonTitles: { drawMarkerButton: "Draw avatar" }
	}, "en");
	this.disableDraw();





	// Object layers

	this.objects = [];
	this.fadeLayer = L.fadeLayer({ pmIgnore: true });
	this.addLayer( this.fadeLayer );

	this.on("pm:create", ev => {
		let o = ev.layer, type = ev.shape;

		if(type == "Marker") {
			let zoom = this.getZoom();
			let p = this.project(o.getLatLng(), zoom),
				url = o.getIcon().options.iconUrl,
				size = o.getIcon().options.iconSize;
			this.removeLayer(o);
			o = L.imageOverlay(url, [
				this.unproject([ p.x - size[0] / 2, p.y - size[1] / 2 ], zoom),
				this.unproject([ p.x + size[0] / 2, p.y + size[1] / 2 ], zoom)
			], {
				interactive:			true,
				zIndex:					200,
				ratio:					496 / 512, // NOTE: this is hard-coded from the pixel-width of 'user-circle-solid.svg'
				rounded:				false,
				angle:					0,
				borderColor:			"#563d7c",
				borderThickness:		0,
				overlayBlur:			0,
				overlayGrayscale:		0,
				overlayBrightness:		0,
				overlayTransparency:	0
			});
			this.addLayer(o);
		}

		o.options.id = uuid();
		o.options.sceneId = _SCENES.active;

		this.fire("_addedlayer", { layer: o });

		this.objects.push( this.extractObject(o) );
	});

	this.on("_addedlayer", async ev => {
		let o = ev.layer;

		let label = o.options.label;
		if(label) {
			o.bindTooltip(label, { direction: "center", permanent: true });
			if(o instanceof L.ImageOverlay) { this.updateTooltip(o); }
		}

		o.on("moveend", ev => { this.updateTooltip(ev.target); });
		o.on("pm:edit", ev => {
			let o = ev.layer;
			this.updateObject(o);
			if(o.options.label) { o.closeTooltip(); o.openTooltip(); }
		});

		o.on("pm:remove", ev => {
			let o = ev.layer;

			this.deleteObject(o);

			o.closeTooltip(); o.unbindTooltip();
			o.closePopup(); o.unbindPopup();
			o.off("popupopen"); o.off("mouseover"); o.off("mouseout");

			o.slideCancel();
		});

		this.setPopup(o);

		o.on("pm:dragstart", ev => { o.unbindPopup(); });
		o.on("pm:dragend", ev => { this.setPopup( ev.layer ); });

		o.on("popupopen", ev => { bind_setup(o); });
		o.on("mouseover", ev => { this.highlightObject(o.options.id); });
		o.on("mouseout", ev => { this.unhighlightObject(o.options.id); });

		let contextmenu = [
			{ text: "Move to front", callback: ev => { o.bringToFront(); }, index: 0 },
			{ text: "Move to back", callback: ev => { o.bringToBack(); }, index: 1 }
		];

		if(o instanceof L.ImageOverlay) {
			contextmenu.push( { text: "Clone avatar", callback: ev => { this.cloneAvatar(o.options.id, o.options.sceneId); }, index: 2 } );
			this.setIcon(o);
		}

		o.bindContextMenu({ contextmenu: true, contextmenuItems: contextmenu });
	});

	this.on("layeradd", ev => {
		let o = ev.layer;
		//let opacity = o.options.opacity;

		/* TODO: fade in layer when added
			Alternatively this can be implemented in each prototypes
			onAdd method (in layers.js), instead of here.
		*/
	});

	this.on("zoomend", ev => {
		for(let o of this.getLayers()) { this.updateTooltip(o); }
	});
	this.on("zoom", ev => { if(this._renderer) { this._renderer._reset(); } });


	this.on("movestart", ev => { /**/ });
	this.on("moveend", ev => { /**/ });

});





L.Map.include({

	setup: function() {
		this.setAspectRatio();

		this.enableDraw();
		this.basemapButton.enable();
		this.textboxButton.enable();

		$(".leaflet-control-attribution>span").before("<span aria-hidden=\"true\">|</span> <a href=\"https://geotales.io\">GeoTales</a> ");
		$(".leaflet-control-attribution a").prop("target", "_blank");
	},
	reset: function() {
		this.clearLayers();
		this.fadeLayer.clearLayers();

		this.disableDraw();
		this.basemapButton.disable();
		this.textboxButton.disable();
	},

	enableDraw: function() {
		this.pm.Toolbar.setButtonDisabled("Marker", false);
		this.pm.Toolbar.setButtonDisabled("Line", false);
		this.pm.Toolbar.setButtonDisabled("Polygon", false);
		this.pm.Toolbar.setButtonDisabled("Rectangle", false);
		this.pm.Toolbar.setButtonDisabled("Circle", false);
		//this.pm.Toolbar.setButtonDisabled("Text", false);
		this.pm.Toolbar.setButtonDisabled("Edit", false);
		this.pm.Toolbar.setButtonDisabled("Drag", false);
		this.pm.Toolbar.setButtonDisabled("Cut", false);
		this.pm.Toolbar.setButtonDisabled("Removal", false);
		this.pm.Toolbar.setButtonDisabled("Rotate", false);
	},
	disableDraw: function() {
		this.pm.Toolbar.setButtonDisabled("Marker", true);
		this.pm.Toolbar.setButtonDisabled("Line", true);
		this.pm.Toolbar.setButtonDisabled("Polygon", true);
		this.pm.Toolbar.setButtonDisabled("Rectangle", true);
		this.pm.Toolbar.setButtonDisabled("Circle", true);
		//this.pm.Toolbar.setButtonDisabled("Text", true);
		this.pm.Toolbar.setButtonDisabled("Edit", true);
		this.pm.Toolbar.setButtonDisabled("Drag", true);
		this.pm.Toolbar.setButtonDisabled("Cut", true);
		this.pm.Toolbar.setButtonDisabled("Removal", true);
		this.pm.Toolbar.setButtonDisabled("Rotate", true);
	},

	setOrientation: function(pos) {
		switch(pos) {
			case "left":
				this.returnButton.setPosition("bottomleft");
				this.basemapButton.setPosition("bottomleft");
				this.pm.Toolbar.setBlockPosition("draw", "topleft");
				this.pm.Toolbar.setBlockPosition("edit", "topleft");
				this.textboxButton.setPosition("topright");
				break;

			case "right":
				this.returnButton.setPosition("bottomright");
				this.basemapButton.setPosition("bottomright");
				this.pm.Toolbar.setBlockPosition("draw", "topright");
				this.pm.Toolbar.setBlockPosition("edit", "topright");
				this.textboxButton.setPosition("topleft");
				break;

			default: break;
		}
	},

	setHomeBounds: function(bounds) {
		if(this.returnButton) {
			this.returnButton.setHomeBounds(bounds, { maxZoom: this.getMaxZoom() });
		}
	},

	setAspectRatio: function(ratio) {
		if(ratio) { _OPTIONS.aspectratio = ratio; }
		let w = $("#mapRow").outerWidth(),
			h = $("#mapRow").outerHeight(),
			r = _OPTIONS.aspectratio;

		let dim = get_aspect_ratio_dimentions(w, h, r);
		$("#map").css({
			width: `${(dim[0]/w) * 100}%`,
			height: `calc(${(dim[1]/h) * 100}% - 39px - 49px)`,
			left: `${(((w - dim[0]) / 2) / w) * 100}%`,
			top: `calc(${(((h - dim[1]) / 2)/ h) * 100}% + 39px + 49px)`
		});

		this.invalidateSize();
		if(_SCENES.active) { this.setFlyTo( _SCENES.get( _SCENES.active ).bounds ); }
	},

	setFlyTo: function(bounds) {
		this.flyToBounds(bounds, { maxZoom: this.getMaxZoom(), noMoveStart: true, duration: _OPTIONS.panningspeed || null });
		this.setHomeBounds(bounds);
	},



	clearLayers: function() {
		for(let o of this.getLayers()) {
			this.removeLayer(o);
		}
	},

	getLayers: function() {
		return this.pm.getGeomanLayers();
	},

	addScene: function(sceneId) {
		let prev = _SCENES.getPrevScene(sceneId);
		if(!prev || !_OPTIONS.objectOptIn) { return; }
		let prevId = prev.id;

		for(let object of this.objects) {
			if(object.sceneId == prevId) {
				let o = Object.assign({}, object);
				o.sceneId = sceneId;
				this.objects.push(o);
			}
		}

		_SCENES.store[ _SCENES.get(sceneId).index ].setWMS();
	},
	deleteScene: function(sceneId) {
		this.objects = this.objects.filter(o => o.sceneId != sceneId);
	},

	highlightObject: function(id) {
		let o = this.fadeLayer.getObject(id);
		if(!o) { return; }

		if(o instanceof L.ImageOverlay) { o.setOpacity( 0.8 ); }
		else{ o.setStyle({ opacity: 0.8 }); }
	},
	unhighlightObject: function(id) {
		let o = this.fadeLayer.getObject(id);
		if(!o) { return; }

		if(o instanceof L.ImageOverlay) { o.setOpacity( 0.3 ); }
		else{ o.setStyle({ opacity: 0.3 }); }
	},

	setObjects: function(sceneId) {
		let prev = _SCENES.getPrevScene(sceneId);
		let prevId = prev ? prev.id : null;

		this.fadeLayer.clearLayers();
		if(prevId) {
			for(let o of this.objects) {
				if(o.sceneId == prevId) { this.fadeLayer.addLayer(this.createObject(o), o.id); }
			}
		}

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
				this.addLayer( object );
				this.fire("_addedlayer", { layer: object });

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

	insertObject: function(o) {
		for(let oo of this.getLayers()) {
			if(oo.options.id == o.options.id) { return; }
		}

		let object;
		for(let oo of this.objects) {
			if(oo.id == o.options.id
			&& oo.sceneId == o.options.sceneId) {
				object = Object.assign({}, oo);
				break;
			}
		}
		object.sceneId = _SCENES.active;

		let oo = this.createObject(object);
		this.addLayer( oo );
		this.fire("_addedlayer", { layer: oo });
		this.objects.push(object);
	},
	cloneAvatar: function(id, sceneId) {
		let object;
		for(let o of this.objects) {
			if(o.id == id && o.sceneId == sceneId) {
				object = Object.assign({}, o);
				break;
			}
		}

		object.id = uuid();

		let zoom = this.getZoom();
		let nw = this.project(object.pos[0], zoom),
			se = this.project(object.pos[1], zoom);
		nw.x += 50; nw.y += 50;
		se.x += 50; se.y += 50;
		nw = this.unproject(nw, zoom);
		se = this.unproject(se, zoom);

		object.pos = [[nw.lat, nw.lng], [se.lat, se.lng]];

		let o = this.createObject(object);
		this.addLayer(o);
		this.fire("_addedlayer", { layer: o });
		this.objects.push(object);
	},

	updateObject: function(o) {
		for(let i = 0; i < this.objects.length; i++) {
			let oo = this.objects[i];
			if(oo.id == o.options.id
			&& oo.sceneId == o.options.sceneId) {
				this.objects[i] = this.extractObject(o);
				break;
			}
		}
	},

	deleteObject: function(o) {
		for(let i = 0; i < this.objects.length; i++) {
			let oo = this.objects[i];
			if(oo.id == o.options.id
			&& oo.sceneId == o.options.sceneId) {
				this.objects.splice(i, 1);
				break;
			}
		}
	},

	globalObjectOptions: function(object) {
		let o = this.extractObject(object);
		delete o.id; delete o.sceneId; delete o.type; delete o.pos;
		if(object instanceof L.Circle) { delete o.radius; }

		for(let i = 0; i < this.objects.length; i++) {
			let oo = this.objects[i];
			if(oo.id == object.options.id && oo.sceneId != object.options.sceneId) {
				this.objects[i] = Object.assign({}, oo, o);
			}
		}

		var object = this.fadeLayer.getObject(object.options.id);
		if(object) {
			this.fadeLayer.removeLayer(object);

			let oo = Object.assign({}, this.extractObject(object), o);
			this.fadeLayer.addLayer(this.createObject(oo), oo.id);
		}
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

	setPopup: function(o) {
		o.unbindPopup();
		let popup =
			o instanceof L.ImageOverlay ? avatar_popup() :
			o instanceof L.Rectangle
		 || o instanceof L.Polygon
		 || o instanceof L.Circle ? polygon_popup() :
			o instanceof L.Polyline ? polyline_popup() : "";
		if(!popup) { return; }
		o.bindPopup(popup, { keepInView: true, closeOnEscapeKey: false, maxWidth: 350, maxHeight: 450 });
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

	getCenterBasemapTile: function() {
		if(this.basemap instanceof L.ImageOverlay) {
			return this.basemap._url;
		}

		let s = this.basemap.getTileSize(),
			c = this.project( this.getCenter(), this.getZoom() ),
			r = "";

		try { r = this.basemap.getTileUrl({ x: Math.floor(c.x / s.x), y: Math.floor(c.y / s.y) }); }
		catch(e) { console.error(e); }

		return r;
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
				pmIgnore: true,
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
		save_data();
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
					interactive:			true,
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
					overlayTransparency:	o.transparency,
					animationspeed:			o.animationspeed
				});
				break;

			case "polyline":
				oo = L.polyline(o.pos, {
					label:			o.label,
					dashArray:		o.dashed ? "5, 10" : "",
					color:			o.color,
					weight:			o.thickness,
					opacity:		1 - o.transparency,
					animationspeed:	o.animationspeed
				});
				break;

			case "polygon":
				oo = L.polygon(o.pos, {
					label:			o.label,
					dashArray:		o.dashed ? "5, 10" : "",
					color:			o.lineColor,
					weight:			o.lineThickness,
					opacity:		1 - o.lineTransparency,
					fillColor:		o.fillColor,
					fillOpacity:	1 - o.fillTransparency,
					animationspeed:	o.animationspeed
				});
				break;

			case "rectangle":
				oo = L.rectangle(o.pos, {
					label:			o.label,
					dashArray:		o.dashed ? "5, 10" : "",
					color:			o.lineColor,
					weight:			o.lineThickness,
					opacity:		1 - o.lineTransparency,
					fillColor:		o.fillColor,
					fillOpacity:	1 - o.fillTransparency,
					animationspeed:	o.animationspeed
				});
				break;

			case "circle":
				oo = L.circle(o.pos, {
					radius:			o.radius,
					label:			o.label,
					dashArray:		o.dashed ? "5, 10" : "",
					color:			o.lineColor,
					weight:			o.lineThickness,
					opacity:		1 - o.lineTransparency,
					fillColor:		o.fillColor,
					fillOpacity:	1 - o.fillTransparency,
					animationspeed:	o.animationspeed
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
	},

	exportData: function() { return this.objects; }

});
