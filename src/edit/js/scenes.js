/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";

import { uuid, save_data, flash_map } from "./helpers.js";
import { new_scene } from "./generate.js";


export function Scenes() {
	this.store = [];
	this.active = "";
	this.copiedBounds = null;


	this.setup = function() {
		$("#scenes").sortable({ // https://api.jqueryui.com/sortable/
			cursor: "move", handle: "button#reorder", items: "> li", containment: "parent", tolerance: "pointer", cancel: "", zIndex: 1003, axis: "x", //scroll: false,
			start: (ev, ui) => {
				ev.stopPropagation();
				this.unbind();
			},
			update: (ev, ui) => {
				ev.stopPropagation();
				//let id = $(ui.item[0]).data("id"), order = $("#scenes").sortable("toArray");
				this.reorder( $("#scenes").sortable("toArray") );
			},
			stop: (ev, ui) => {
				ev.stopPropagation();
				this.bind();
			}
		});

		$("#sceneRow button#delete, #sceneRow button#recapture").prop("disabled", false);
	};

	this.reset = function() {
		$("#scenes").sortable("destroy");
		$("#sceneRow button#delete, #sceneRow button#recapture").prop("disabled", true);
	};

	this.get = function(id) {
		for(let i = 0; i < this.store.length; i++) {
			let s = Object.assign({}, this.store[i]);
			if(s.id == id) { s.index = i; return s; }
		}
		return null;
	};

	this.getEl = function(el) {
		for(let i = 0; i < this.store.length; i++) {
			let s = Object.assign({}, this.store[i]);
			if( $(`li[data-id="${s.id}"]`)[0].contains(el) ) { s.index = i; return s; }
		}
		return null;
	};

	this.getPrevScene = function(id) {
		let s = this.get(id);
		if(!s || s.index <= 0) { return; }

		return Object.assign({}, this.store[ s.index - 1 ]);
	};

	this.reorder = function(order) {
		this.store.sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id));
		this.set(this.active);
	};

	this.add = function() {
		if(this.store.length <= 0) {
			document.dispatchEvent( new Event("_setup") );
		}

		let s = new Scene(null, this.active);
		s.capture();

		if(this.active) { this.store.splice(this.get(this.active).index + 1, 0, s); }
		else{ this.store.push(s); }

		_TEXTBOXES.addScene(s.id);
		_MAP.addScene(s.id);

		this.set(s.id);
		this.bind();

		save_data();
	};

	this.capture = function() {
		if(!this.active) { return; }

		let s = this.store[ this.get(this.active).index ];
		s.capture();
		flash_map();
		save_data();
	};

	this.delete = function() {
		if(!this.active) { return; }

		let s = this.get( this.active );

		_TEXTBOXES.deleteScene(s.id);
		_MAP.deleteScene(s.id);

		if( !this.prev() ) { this.next(); }

		this.store.splice(s.index, 1);

		$(`li[data-id="${s.id}"]`).remove();

		this.setNumbering();

		if(this.store.length <= 0) {
			this.active = "";
			document.dispatchEvent( new Event("_reset") );
		}

		save_data();
	};

	this.unbind = function() {
		$("#scenes li button#reorder").prop("disabled", true);
		$("#scenes li").off("click");
	};
	this.bind = function() {
		$("#scenes li button#reorder").prop("disabled", false);
		$("#scenes li").off("click");
		$("#scenes li").click(ev => {
			let s = this.getEl(ev.target);
			if(!s) { return; }

			let el = $(`li[data-id="${s.id}"]`);
			if(el.hasClass("active")) { return; }

			this.set(s.id);
		});
	};

	this.prev = function() {
		let s = this.get(this.active);
		if(!s || s.index <= 0) { return; }

		s = this.store[ s.index - 1 ];
		this.set(s.id);
		return Object.assign({}, s);
	};

	this.current = function() {
		this.set(this.active);
		this.bind();
	};

	this.next = function() {
		let s = this.get(this.active);
		if(!s || s.index >= this.store.length - 1) { return; }

		s = this.store[ s.index + 1 ];
		this.set(s.id);
		return Object.assign({}, s);
	};

	this.set = function(id) {
		if(this.active) { this.get(this.active).disable(); }
		this.active = id;

		let s = this.get(id);
		s.enable();

		$(`li[data-id="${s.id}"]`)[0].scrollIntoView({ behavior: "smooth", inline: "center" });

		_TEXTBOXES.set(s.id);
		_MAP.set(s.id);

		this.setNumbering();
	};

	this.setWMS = function() {
		this.store[ this.get(this.active).index ].setWMS();
	};
	this.setBasemap = function() {
		this.store[ this.get(this.active).index ].setBasemap();
	};

	this.setBookmark = function(b) {
		if(!this.active) { return; }

		let s = this.store[ this.get(this.active).index ];
		s.setBookmark(b);
		save_data();
	};

	this.setNumbering = function() {
		let i = 1;
		for(let n of $("#scenes li span#num")) {
			$(n).html(i++);
		}
	};

	this.copyBounds = function() {
		if(!this.active) { return; }

		this.copiedBounds = this.get(this.active).bounds;
	};

	this.pasteBounds = function() {
		if(!this.active) { return; }

		let s = this.store[ this.get(this.active).index ];
		s.setBounds(this.copiedBounds);
	};

	this.importData = function(data) {
		if(data.length <= 0) { return; }

		if(this.store.length <= 0 || !this.active) {
			this.active = data[0].id;
		}

		for(let o of data) {
			let s = new Scene(o.id);
			s.bounds = o.bounds;
			s.wms = o.wms;
			s.basemap = o.basemap;

			s.setBookmark(o.bookmark);
			s.setTitle(o.title);

			s.disable();

			this.store.push(s);
		}
	};

	this.exportData = function() {
		let r = [];
		for(let s of this.store) { r.push( s.exportData() ); }
		return r;
	};
}



function Scene(id, prevId) {
	this.id = id || uuid();

	this.bounds = null;
	this.wms = null;
	this.basemap = null;

	this.bookmark = false;
	this.title = "";

	new_scene(this.id, prevId);

	$(`li[data-id="${this.id}"]`).on("keydown keyup", ev => { ev.stopPropagation(); });
	$(`li[data-id="${this.id}"] input#title`).change(ev => { this.title = ev.target.value; });


	this.enable = function() {
		$(`li[data-id="${this.id}"]`).addClass("active");
		$(`li[data-id="${this.id}"] input, li[data-id="${this.id}"] button`).prop("disabled", false);
		$(`li[data-id="${this.id}"] input, li[data-id="${this.id}"] button`).click(ev => { ev.stopPropagation(); });
	};

	this.disable = function() {
		$(`li[data-id="${this.id}"]`).removeClass("active");
		$(`li[data-id="${this.id}"] input`).prop("disabled", true);
		$(`li[data-id="${this.id}"] input, li[data-id="${this.id}"] button`).off("click");
	};

	this.setBounds = function(bounds) {
		this.bounds = bounds;
		_MAP.setFlyTo( this.bounds );
	};

	this.setWMS = function() { this.wms = _MAP.getWMS(); };
	this.setBasemap = function() { this.basemap = _MAP.getBasemap(); };

	this.setBookmark = function(b) {
		this.bookmark = b;
		if(b) { $(`li[data-id="${this.id}"]`).addClass("bookmark"); }
		else{ $(`li[data-id="${this.id}"]`).removeClass("bookmark"); }
	};

	this.setTitle = function(t) {
		this.title = t;
		$(`li[data-id="${this.id}"] input#title`).val(this.title);
	};

	this.capture = function() {
		let nw = _MAP.getBounds().getNorthWest(),
			se = _MAP.getBounds().getSouthEast();
		this.setBounds( [[nw.lat, nw.lng], [se.lat, se.lng]] );
		this.setBasemap();
	};

	this.exportData = function() {
		return {
			id: this.id,
			bounds: this.bounds,
			wms: this.wms,
			basemap: this.basemap,
			bookmark: this.bookmark,
			title: this.title
		};
	};
}
