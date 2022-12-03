/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                    *
*******************************************************************************/

"use strict";


class BtnControl {
	constructor({ className = "", title = "", icon = "fas fa-times", eventHandler = null }) {
		this._className = className;
		this._title = title;
		this._icon = icon;
		this._eventHandler = eventHandler;
	}

	onAdd(map) {
		this._map = map;

		this._i = document.createElement("i");
		this._i.className = this._icon;

		this._btn = document.createElement("button");
		this._btn.className = `mapboxgl-ctrl-icon ${this._className}`;
		this._btn.type = "button";
		this._btn["aria-disabled"] = false;
		this._btn["aria-label"] = this._title;
		this._btn.title = this._title;
		this._btn.onclick = this._eventHandler;
		this._btn.appendChild(this._i);

		this._container = document.createElement("div");
		this._container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
		this._container.appendChild(this._btn);

		return this._container;
	}

	onRemove() {
		this._container.parentNode.removeChild(this._container);
		this._map = undefined;
	}
}


export function HomeControl({ eventHandler: eventHandler }) {
	return new BtnControl({
		className: "",
		title: "Return to map-extent",
		icon: "fas fa-home",
		eventHandler: eventHandler
	});
};

export function BasemapControl({ eventHandler: eventHandler }) {
	return new BtnControl({
		className: "",
		title: "Change basemap",
		icon: "fas fa-layer-group",
		eventHandler: eventHandler
	});
};

export function TextboxControl({ eventHandler: eventHandler }) {
	return new BtnControl({
		className: "",
		title: "Add book",
		icon: "fas fa-comment-alt",
		eventHandler: eventHandler
	});
};


export class AvatarControl {
	constructor({ eventHandler = null }) {
		this._title = "Avatar tool";
		this._icon = "fas fa-user-circle";
		this._eventHandler = eventHandler;
	}

	onAdd(map) {
		this._map = map;

		this._i = document.createElement("i");
		this._i.className = this._icon;

		this._btn = document.createElement("button");
		this._btn.className = "mapbox-gl-draw_ctrl-draw-btn";
		this._btn.type = "button";
		this._btn["aria-disabled"] = false;
		this._btn["aria-label"] = this._title;
		this._btn.title = this._title;
		this._btn.onclick = this._eventHandler;
		this._btn.appendChild(this._i);

		this._container = document.querySelector(".mapboxgl-ctrl-top-right .mapboxgl-ctrl-group");
		this._container.prepend(this._btn);

		return this._container;
	}

	onRemove() {
		this._container.removeChild(this._btn);
		this._map = undefined;
	}
}
