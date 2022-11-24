/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";

import { uuid } from "./helpers.js";


export function Textboxes() {
	this.store = [];


	this.setup = function() {
		//
	};

	this.reset = function() {
		//
	};

	this.get = function(sceneId) {
		for(let i = 0; i < this.store.length; i++) {
			let t = Object.assign({}, this.store[i]);
			if(t.sceneId == sceneId) { t.index = i; return t; }
		}
		return null;
	};

	this.delete = function(sceneId) {
		let t = this.get(sceneId);
		t.disable();
		this.store.splice(t.index, 1);
	};

	this.bind = function() {
		$("#textbox #content img").off("click");
		$("#textbox #content img").click(ev => { ev.stopPropagation();
			$("#imageModal img#imgPreview").attr("src", ev.target.src);
			$("#imageModal").modal("show");
		});
	};

	this.set = function(sceneId) {
		for(let t of this.store) {
			if(t.sceneId == sceneId) { t.enable(); break; }
			else{ t.disable(); }
		}
		setTimeout(() => { this.bind(); }, 150);
	};

	this.setOrientation = function(pos) {
		switch(pos) {
			case "left":
				$("#textbox").css({ left: "15px", right: "auto" });
				_SCENES.setOrientation("left");
				_MAP.setOrientation("right");
				break;

			case "right":
				$("#textbox").css({ left: "auto", right: "15px" });
				_SCENES.setOrientation("right");
				_MAP.setOrientation("left");
				break;

			default: break;
		}
	};

	this.resize = function() {
		let ww = $(window).width(),
			wh = $(window).height(),
			mh = $("#map").height(),
			th = $("#textbox #content")[0].scrollHeight, top;
		let isSmall = ww <= 575.98 && wh > 450;

		if(mh >= wh && isSmall) { top = wh * 0.7; }
		else if(isSmall) { top = mh + 10; }
		else { top = 10; }
		$("#textbox").css("top", `${top}px`);

		$("#textbox").removeClass("noBottom");
		if(th <= wh - 58
		&& !(mh >= wh && isSmall)) { $("#textbox").addClass("noBottom"); }
	};

	this.importData = function(data) {
		if(data.length <= 0) { return; }

		for(let o of data) {
			let t = new Textbox(o.id);
			t.sceneId = o.sceneId;
			t.locked = o.locked;
			t.pos = o.pos; t.dim = o.dim;
			t.content = o.content;

			t.disable();

			this.store.push(t);
		}
	};
}



function Textbox(id) {
	this.id = id || uuid();

	this.sceneId = "";
	this.locked = false;

	this.pos = "left";
	this.dim = [0, 0.25];
	this.content = "";


	this.enable = function() {
		if(this.content == "") { return; }

		_TEXTBOXES.setOrientation(this.pos);

		$("#textbox #content").html(this.content);
		$("#textbox").css("opacity", 0.8);

		if(this.dim) {
			$("#textbox").css("max-width", `${this.dim[1] * 100}%`);
		}

		// NOTE: this is to counteract the textbox being streched to the bottom of the screen if the textbox is smaller than the height of the screen
		_TEXTBOXES.resize();
	};

	this.disable = function() {
		$("#textbox").css("opacity", 0);
	};
}
