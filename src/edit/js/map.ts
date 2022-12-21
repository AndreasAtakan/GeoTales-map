/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Jonas Møller <jonas@moesys.no>, December 2022                     *
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
	pos: number[];
	quat: number[];

	// TODO: Angle

	constructor(pos: number[], quat: number[]) {
		this.pos = pos;
		this.quat = quat;
	}

	set(map: Map) {
		const opts = new FreeCameraOptions(this.pos, this.quat);
		map.setFreeCameraOptions(opts);
	}
}

function mercatorToVec(coord: MercatorCoordinate): number[] {
	if (coord.z) {
		return [ coord.x, coord.y, coord.z ]
	} else {
		return [ coord.x, coord.y ]
	}
}

const QUAT_ZERO = [0, 0, 0, 1];

function lerp(u: number[], v: number[], alpha: number): number[] {
	let vo = [];
	for (let i = 0; i < Math.min(u.length, v.length); i++) {
		vo.push(u[i] * (1.0 - alpha) + v[i] * alpha);
	}
	return vo;
}

class CamInterpolation {
	ppos: number[];
	pquat: number[];
	pos: number[];
	quat: number[];
	t: number;
	max_t: number;

	constructor(pvp: FreeCameraOptions, vp: FreeCameraOptions, secs: number) {
		this.ppos = mercatorToVec(pvp.position);
		this.pos = mercatorToVec(vp.position);
		this.pquat = (pvp as any).orientation;
		this.quat = (vp as any).orientation;
		if (!this.pquat) this.pquat = QUAT_ZERO;
		if (!this.quat) this.quat = QUAT_ZERO;
		this.t = 0;
		this.max_t = secs;
	}

	step(dt: number): CamFrame | null {
		if ((this.t += dt) >= this.max_t) return null;

		const alpha = this.t / this.max_t;
		let pos = lerp(this.ppos, this.pos, alpha);
		let quat = lerp(this.pquat, this.quat, alpha);

		return new CamFrame(pos, quat);
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
		const pvp = this.map.getFreeCameraOptions();
		const interp = new CamInterpolation(pvp, vp, secs);
		console.log(interp);

		let last_time = null;
		const advanceFrame = (time) => {
			time /= 10000;

			if (!last_time) last_time = time;
			let dt = time - last_time;

			const frame = interp.step(dt);
			if (frame) {
				frame.set(this.map);
				window.requestAnimationFrame(advanceFrame);
			} else {
				this.map.setFreeCameraOptions(vp);
			}
		};

		window.requestAnimationFrame(advanceFrame);
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
