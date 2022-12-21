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

import mapboxgl, { FreeCameraOptions, Map, MercatorCoordinate } from "mapbox-gl";
import consts from "./consts";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import FreehandMode from "mapbox-gl-draw-freehand-mode";
//import FreehandLine from "./map/FreehandLine.js";

import { HomeControl, BasemapControl, AvatarControl, TextboxControl } from "./map/CustomControls.js";
import { Scenes } from "./scenes.js";

mapboxgl.accessToken = "pk.eyJ1IjoiYW5kcmVhc2F0YWthbiIsImEiOiJja3dqbGlham0xMDAxMnhwazkydDRrbDRwIn0.zQJIqHf0Trp--7GHLc4ySg";

class CamFrame {
	pos: number[]

	// TODO: Angle

	constructor(pos: number[]) {
		this.pos = pos;
	}

	set(map: Map) {
	}
}

function mercatorToVec(coord: MercatorCoordinate): number[] {
	if (coord.z) {
		return [ coord.x, coord.y, coord.z ]
	} else {
		return [ coord.x, coord.y ]
	}
}

class CamInterpolation {
	ppos: number[];
	pos: number[];
	t: number;
	max_t: number;

	constructor(pvp: FreeCameraOptions, vp: FreeCameraOptions, secs: number) {
		this.ppos = mercatorToVec(pvp.position);
		this.pos = mercatorToVec(vp.position);
		this.t = 0;
		this.max_t = secs;
	}

	step(dt: number): CamFrame | null {
		if ((this.t += dt) >= this.max_t) return null;

		const alpha = this.t / this.max_t;
		let pos = [];
		for (let i = 0; i < this.ppos.length; i++) {
			pos.push(this.ppos[i] * (1.0 - alpha) + this.pos[i] * alpha);
		}

		// TODO: Angle

		return new CamFrame(pos);
	}
}

export class MMap {
	map: mapboxgl.Map;
	draw: MapboxDraw;
	vp: FreeCameraOptions | null;

	constructor() {
		this.map = new mapboxgl.Map({
			container: "map",
			style: "mapbox://styles/mapbox/dark-v11",
			customAttribution: `&copy; <a href=\"https://${consts.HOST}/\" target=\"_blank\">GeoTales</a>`,
			projection: {name: "globe"},
			center: [ 14, 49 ],
			zoom: window.innerWidth < 575.98 ? 3 : 4,
			doubleClickZoom: false,
			keyboard: false
		});

		this.map.on('mousemove', (e) => {
			const fts = this.map.queryRenderedFeatures(e.point);
			// for (let ft of fts) {
			//     if (ft.)
			// }
			console.log("moving the mouse");
			console.log(fts);
			console.log(this.map.getFreeCameraOptions());
		})

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
		// TODO
	}

	reset() {
		// TODO
	}

	/// Interpolate camera movement to new `vp` camera options
	camInterp(vp: FreeCameraOptions, secs: number) {
		console.log("cam interp ...");
		this.vp = vp;
		// TODO: Mapbox doesn't handle this for us, so we actually need to do
		// some work here. But there is some example code out there for how to do
		// this interpolation, you could also browse the documentation for
		// combinations of animation functions that would accomplish the same thing
		const pvp = this.map.getFreeCameraOptions();
		this.map.setFreeCameraOptions(vp);
		const interp = new CamInterpolation(pvp, vp, secs);
		const frame = interp.step(0.5);
		frame.set(this.map);
	}

	zoomHome(secs: number) {
		if (this.vp) {
			this.camInterp(this.vp, secs)
		}
	}

	setBasemap(map) {
		// TODO
	}

	setWMS(wms) {
		// TODO
	}
}
