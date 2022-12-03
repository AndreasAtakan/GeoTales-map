/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";

//import "trumbowyg";

import { uuid, save_data } from "./helpers.js";


export class Textboxes {
	constructor() {
		this.store = [];

		$("input#_img_textbox").change(function(ev) {
			let file = $(this)[0].files[0];
			if(!file) { return; }

			$("#loadingModal").modal("show");
			let data = new FormData();
			data.append("type", "image");
			data.append("image", file);
			$.ajax({
				type: "POST",
				url: "api/upload_create.php",
				data: data,
				contentType: false,
				processData: false,
				success: function(result, status, xhr) {
					$("#textbox #content").trumbowyg("execCmd", { cmd: "insertImage", param: result, forceCss: false, skipTrumbowyg: true });
					setTimeout(function() { $("#loadingModal").modal("hide"); }, 750);
				},
				error: function(xhr, status, error) {
					console.log(xhr.status, error);
					setTimeout(function() { $("#loadingModal").modal("hide"); $("#errorModal").modal("show"); }, 750);
				}
			});
		});

		$("#textbox input#lock").change(ev => {
			this.setLock( ev.target.checked );
		});

		$("#textbox button#close").click(ev => { this.delete(_SCENES.active); });

		$("#textboxOptionsModal select#bookOrientation").change(ev => {
			this.setOrientation( ev.target.value );
		});
	}


	setup() {
		$("#textbox").resizable({ // https://api.jqueryui.com/resizable/
			containment: "#mapRow", handles: "e", minWidth: 100,
			stop: (ev, ui) => {
				let w = ui.size.width / ($("#mapRow").outerWidth() - 20),
					t = this.get(_SCENES.active);
				if(t) {
					this.store[ t.index ].dim = [0, w];
					$("#textbox").css({ width: `${w * 100}%` });
					if(t.pos == "right") { $("#textbox").css({ left: "auto" }); }
				}
			}
		});

		$("#textbox #content").trumbowyg({
			autogrow: true, semantic: false, resetCss: true, removeformatPasted: true, urlProtocol: true,
			defaultLinkTarget: "_blank",
			tagsToRemove: ["script", "link"],
			btnsDef: {
				format: { dropdown: ["bold", "italic", "underline", "del"], title: "Format", ico: "bold" },
				align: {
					dropdown: ["justifyLeft", "justifyCenter", "justifyRight", "justifyFull", "unorderedList", "orderedList"],
					title: "List/Align",
					ico: "justifyLeft"
				},
				uploadImg: {
					fn: ev => { $("input#_img_textbox").click(); },
					title: "Add image", ico: "insertImage"
				},
				makeLink: {
					fn: ev => {
						$("#textbox #content").trumbowyg("saveRange");
						let text = $("#textbox #content").trumbowyg("getRangeText");
						if(text.replace(/\s/g, "") == "") { return; }

						if(["http", "https"].indexOf(text.split("://")[0]) < 0) { text = `https://${text}`; }
						$("#textbox #content").trumbowyg("execCmd", { cmd: "insertHTML", param: `<a href="${text}" target="_blank">${text}</a>`, forceCss: false });
					},
					title: "Create link", ico: "link"
				}
			},
			btns: [
				["formatting"], ["format"], ["align"], ["fontfamily"], ["foreColor", "backColor"], ["makeLink"], ["uploadImg"]
			],
			plugins: {}
		}).on("tbwchange", () => {
			let t = this.get(_SCENES.active);
			if(t) { this.store[ t.index ].content = $("#textbox #content").trumbowyg("html"); }
		});

		_MAP.setOrientation("right");
	}

	reset() {
		$("#textbox").resizable("destroy");
		$("#textbox #content").trumbowyg("destroy");
		_MAP.setOrientation("right");
	}

	get(sceneId) {
		for(let i = 0; i < this.store.length; i++) {
			let t = Object.assign({}, this.store[i]);
			if(t.sceneId == sceneId) { t.index = i; return t; }
		}
		return null;
	}

	add() {
		if(!_SCENES.active) { return; }

		let t = new Textbox(null);
		t.sceneId = _SCENES.active;
		t.enable();
		this.store.push(t);
		save_data();
	}

	addScene(sceneId) {
		let prev = _SCENES.getPrevScene(sceneId);
		if(prev) {
			for(let t of this.store) {
				if(t.sceneId == prev.id && t.locked) {
					let tt = new Textbox(null);
					tt.sceneId = sceneId;
					tt.pos = t.pos; tt.dim = t.dim;
					tt.content = t.content;
					tt.locked = true;
					tt.enable();
					this.store.push(tt);
					break;
				}
			}
		}
	}

	delete(sceneId) {
		let t = this.get(sceneId);
		if(!t) { return; }

		t.disable();
		this.store.splice(t.index, 1);
		save_data();
	}

	deleteScene(sceneId) {
		for(let t of this.store) {
			if(t.sceneId == sceneId) { this.delete(t.sceneId); }
		}
	}

	set(sceneId) {
		for(let t of this.store) {
			if(t.sceneId == sceneId) { t.enable(); break; }
			else{ t.disable(); }
		}
	}

	setLock(l) {
		let t = this.get(_SCENES.active);
		if(!t) { return; }

		this.store[ t.index ].setLock(l);
	}

	setOrientation(pos) {
		let t = this.get(_SCENES.active);
		if(!t) { return; }

		this.store[ t.index ].pos = pos;
		this.store[ t.index ].setOrientation();
	}

	importData(data) {
		if(data.length <= 0) { return; }

		for(let o of data) {
			let t = new Textbox(o.id);
			t.sceneId = o.sceneId;
			if(o.pos) { t.pos = o.pos; }
			if(o.dim) { t.dim = o.dim; }
			t.content = o.content;
			t.locked = o.locked;

			t.disable();

			this.store.push(t);
		}
	}

	exportData() {
		let r = [];
		for(let t of this.store) { r.push( t.exportData() ); }
		return r;
	}
}



class Textbox {
	constructor(id) {
		this.id = id || uuid();

		this.sceneId = "";
		this.locked = false;

		this.pos = "left";
		this.dim = [0, 0.25];
		this.content = "";
	}


	setOrientation() {
		switch(this.pos) {
			case "left":
				$("#textbox").css({ left: "10px", right: "auto" });
				$("#textbox").resizable("option", { handles: "e" });
				_MAP.setOrientation("right");
				break;

			case "right":
				$("#textbox").css({ left: "auto", right: "10px" });
				$("#textbox").resizable("option", { handles: "w" });
				_MAP.setOrientation("left");
				break;

			default: break;
		}
	}

	setLock(l) {
		this.locked = l;
		$("#textbox input#lock").prop("checked", this.locked);
	}

	enable() {
		this.setOrientation();

		$("#textbox").css("display", "block");
		$("#textbox").css({ width: `${this.dim[1] * 100}%` });

		$("#textbox #content").trumbowyg("enable");
		$("#textbox #content").trumbowyg("html", this.content);

		$("#textbox #lock").prop({ disabled: false, checked: this.locked });

		_MAP.textboxButton.disable();
	}

	disable() {
		$("#textbox").css("display", "none");
		$("#textbox #content").trumbowyg("disable");
		$("#textbox #lock").prop("disabled", true);
		_MAP.textboxButton.enable();
	}

	exportData() {
		return {
			id: this.id,
			sceneId: this.sceneId,
			locked: this.locked,
			pos: this.pos,
			dim: this.dim,
			content: this.content
		};
	}
}
