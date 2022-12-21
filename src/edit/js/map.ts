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

function mercatorToVec(coord: MercatorCoordinate | undefined): number[] {
	if (!coord) return [0, 0, 0]

	if (coord?.z) {
		return [ coord.x, coord.y, coord.z ]
	} else {
		return [ coord.x, coord.y ]
	}
}

const QUAT_ZERO = [0, 0, 0, 1];

function lerp(u: number[], v: number[], alpha: number): number[] {
	let vo: number[] = [];
	for (let i = 0; i < Math.min(u.length, v.length); i++) {
		vo.push(u[i] * (1.0 - alpha) + v[i] * alpha);
	}
	return vo;
}

function bblend(t: number) {
	return t*t*(3 - 2*t);
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

	step(dt: number): FreeCameraOptions | null {
		if ((this.t += dt) >= this.max_t) return null;

		const alpha = bblend(this.t / this.max_t);
		let pos = lerp(this.ppos, this.pos, alpha);
		let quat = lerp(this.pquat, this.quat, alpha);

		// return new CamFrame(pos, quat);
		return new FreeCameraOptions(new MercatorCoordinate(pos[0], pos[1], pos[2]),
									 quat);
	}
}

export class MMap extends mapboxgl.Map {
	draw: MapboxDraw;
	vp: FreeCameraOptions | null;

	constructor() {
		super({
			container: "map",
			style: "mapbox://styles/mapbox/dark-v11",
			customAttribution: `&copy; <a href=\"https://${consts.HOST}/\" target=\"_blank\">GeoTales</a>`,
			projection: {name: "globe"},
			center: [ 14, 49 ],
			zoom: window.innerWidth < 575.98 ? 3 : 4,
			doubleClickZoom: false,
			keyboard: false
		});

		this.on('mousemove', (e) => {
			const fts = this.queryRenderedFeatures(e.point);
			console.log("Features at point");
			for (let ft of fts) {
				console.log(ft);
			}
		})

		this.addControl( HomeControl({
			eventHandler: ev => { this.zoomHome(); }
		}), "bottom-right" );

		this.addControl(new mapboxgl.NavigationControl({
			showCompass: false
		}), "bottom-right");

		this.addControl( BasemapControl({
			eventHandler: ev => { $("#basemapModal").modal("show"); init_img_basemaps(); }
		}), "bottom-right" );

		this.addControl( TextboxControl({
			eventHandler: ev => { _TEXTBOXES.add(); }
		}), "top-left" );

		//this.addControl(new mapboxgl.FullscreenControl());


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

		this.addControl(this.draw, "top-right");
		this.addControl( new AvatarControl({
			eventHandler: ev => { console.log("test"); }
		}), "top-right" );


		this.on("load", ev => {
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
	async goto(vp: FreeCameraOptions, secs: number) {
		this.vp = vp;
		const pvp = this.getFreeCameraOptions();
		const interp = new CamInterpolation(pvp, vp, secs);

		return new Promise((resolve, _) => {
			let last_time = null;
			const advanceFrame = (time) => {
				time /= 1000;

				let dt = time - (last_time ? last_time : time);
				last_time = time;

				const frame = interp.step(dt);
				if (frame) {
					this.setFreeCameraOptions(frame);
					window.requestAnimationFrame(advanceFrame);
				} else {
					this.setFreeCameraOptions(vp);
					resolve(undefined);
				}
			};
			window.requestAnimationFrame(advanceFrame);
		});
	}

	async zoomHome(secs: number) {
		if (this.vp) {
			await this.goto(this.vp, secs)
		}
	}

	setBasemap(map) {
		// TODO
	}

	setWMS(wms) {
		// TODO
	}
}
