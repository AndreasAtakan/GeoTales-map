/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                    *
*******************************************************************************/

"use strict";

import { uuid, save_data, init_img_basemaps } from "./helpers.js";
//import { avatar_popup, polyline_popup, polygon_popup } from "./generate.js";
//import { bind_setup } from "./layers.js";

import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import FreehandMode from "mapbox-gl-draw-freehand-mode";
//import FreehandLine from "./map/FreehandLine.js";

import { HomeControl, BasemapControl, AvatarControl, TextboxControl } from "./map/CustomControls.js";


mapboxgl.accessToken = "pk.eyJ1IjoiYW5kcmVhc2F0YWthbiIsImEiOiJja3dqbGlham0xMDAxMnhwazkydDRrbDRwIn0.zQJIqHf0Trp--7GHLc4ySg";

export class MMap {
	constructor() {
		this.map = new mapboxgl.Map({
			container: "map",
			style: "mapbox://styles/mapbox/streets-v12",
			customAttribution: `&copy; <a href=\"https://${_HOST}/\" target=\"_blank\">GeoTales</a>`,
			projection: "mercator",
			center: [ 14, 49 ],
			zoom: window.innerWidth < 575.98 ? 3 : 4,
			doubleClickZoom: false,
			keyboard: false
		});

		this.map.addControl( HomeControl({
			eventHandler: ev => { this.zoomHome(); }
		}), "bottom-right" );

		this.map.addControl(new mapboxgl.NavigationControl({
			showCompass: false
		}), "bottom-right");

		this.map.addControl( BasemapControl({
			eventHandler: ev => { $("#basemapModal").modal("show"); init_img_basemaps(); }
		}), "bottom-right" );

		this.map.addControl( TextboxControl({
			eventHandler: ev => { _TEXTBOXES.add(); }
		}), "top-left" );

		//this.map.addControl(new mapboxgl.FullscreenControl());


		this.draw = new MapboxDraw({
			controls: {
				combine_features: false,
				uncombine_features: false
			},
			modes: Object.assign(MapboxDraw.modes, {
				draw_polygon: FreehandMode,
				//draw_line_string: FreehandLine
			})
		});

		this.map.addControl(this.draw, "top-right");
		this.map.addControl( new AvatarControl({
			eventHandler: ev => { console.log("test"); }
		}), "top-right" );


		this.map.on("load", ev => {
			//
		});
	}

	setup() {
		//
	}

	reset() {
		//
	}

	zoomHome() {
		if(_SCENES.active) { this.map.fitBounds( _SCENES.get( _SCENES.active ).bounds ); }
	}
}
