/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";


L.FadeLayer = L.FeatureGroup.extend({
	addLayer: function(o, id) {
		L.FeatureGroup.prototype.addLayer.call(this, o);
		if(id && !o.options.id) { o.options.id = id; }
		o.options.pmIgnore = true;

		if(o instanceof L.ImageOverlay) {
			o.setOpacity( 0.3 );
			$(o._image).css("border-radius", o.options.rounded ? "50%" : "0");
			//$(o._image).css("transform", `rotate(${o.options.angle}deg)`);
			$(o._image).css("border", `${o.options.borderThickness}px solid ${o.options.borderColor}`);
			$(o._image).css("filter", `
				blur(${o.options.overlayBlur}px)
				grayscale(${o.options.overlayGrayscale * 100}%)
			`);
		}else{
			o.setStyle({ opacity: 0.3 });
			o.setStyle({ fillOpacity: 0.2 });
		}
		o.on("click", ev => { _MAP.insertObject(o); });
	},

	getObject: function(id) {
		for(let o of this.getLayers()) {
			if(o.options.id == id) { return o; }
		}
		return null;
	},

	removeLayer: function(o, id) {
		var o = o || (id ? this.getObject(id) : null);
		if(!o) { return; }
		o.off("click");
		L.FeatureGroup.prototype.removeLayer.call(this, o);
	},

	initialize: function(options) {
		L.FeatureGroup.prototype.initialize.call(this);
		this.options.id = "0";
		this.options = Object.assign({}, this.options, options);
	}
});
L.fadeLayer = function(options) { return new L.FadeLayer(options); };


L.ImageOverlay.include({
	__toGeoJSON: function() {
		if(!this._map) { return; }

		let nw = this.getBounds().getNorthWest(),
			se = this.getBounds().getSouthEast();
		let r = {
			"type": "Feature",
			"properties": {
				"type":				"avatar",
				"label":			this.options.label,
				"icon":				this._url,
				"ratio":			this.options.ratio,
				"rounded":			this.options.rounded,
				"angle":			0,
				"borderColor":		this.options.borderColor,
				"borderThickness":	this.options.borderThickness,
				"blur":				this.options.overlayBlur,
				"grayscale":		this.options.overlayGrayscale,
				"brightness":		this.options.overlayBrightness,
				"transparency":		this.options.overlayTransparency
			},
			"geometry": {
				"type": "Polygon",
				"coordinates": [ [nw.lat, nw.lng], [se.lat, se.lng] ]
			}
		};
		return r;
	}
});

L.Polyline.include({
	__toGeoJSON: function() {
		if(!this._map) { return; }

		let r = L.Polyline.prototype.toGeoJSON.call(this);
		r.properties = {
			"type":			"polyline",
			"label":		this.options.label,
			"dashed":		!!this.options.dashArray,
			"color":		this.options.color,
			"thickness":	this.options.weight,
			"transparency":	1 - this.options.opacity
		};
		return r;
	}
});

L.Polygon.include({
	__toGeoJSON: function() {
		if(!this._map) { return; }

		let r = L.Polygon.prototype.toGeoJSON.call(this);
		r.properties = {
			type:				this instanceof L.Rectangle ? "rectangle" : "polygon",
			label:				this.options.label,
			dashed:				!!this.options.dashArray,
			lineColor:			this.options.color,
			lineThickness:		this.options.weight,
			lineTransparency:	1 - this.options.opacity,
			fillColor:			this.options.fillColor,
			fillTransparency:	1 - this.options.fillOpacity
		};
		return r;
	}
});

L.Circle.include({
	__toGeoJSON: function() {
		if(!this._map) { return; }

		let r = L.Circle.prototype.toGeoJSON.call(this);
		r.properties = {
			"type":				"circle",
			"radius":			this.getRadius(),
			"label":			this.options.label,
			"dashed":			!!this.options.dashArray,
			"lineColor":		this.options.color,
			"lineThickness":	this.options.weight,
			"lineTransparency":	1 - this.options.opacity,
			"fillColor":		this.options.fillColor,
			"fillTransparency":	1 - this.options.fillOpacity
		};
		return r;
	}
});








export function bind_setup(o) {

	$(".objectPopup input#label").change(function(ev) {
		let val = $(this).val();

		if(val) {
			if(!o.getTooltip()) {
				o.bindTooltip( L.tooltip({ direction: "center", permanent: true }, o) );
				if(o instanceof L.ImageOverlay) { _MAP.updateTooltip(o); }
			}
			o.setTooltipContent(val);
		}
		else{ o.unbindTooltip(); }

		o.options.label = val;
		_MAP.updateObject(o);
	});
	$(".objectPopup input#label").val(o.options.label || "");

	if(o instanceof L.ImageOverlay) {
		$("#avatarPopup #iconChoose #iconCol").remove();
		for(let i of _ICONS.slice().reverse()) {
			$("#avatarPopup #iconChoose").prepend(`
				<div class="col" id="iconCol">
					<img class="img-fluid rounded" id="icons" src="${i}" alt="&nbsp;" />
				</div>
			`);
		}

		$("input#_img_icon").off("change");
		$("input#_img_icon").change(function(ev) {
			let file = $(this)[0].files[0];
			if(!file) { return; }

			$("#loadingModal").modal("show");

			let fr = new FileReader();
			fr.onload = async function() {
				let img = new Image();
				img.src = fr.result;
				await img.decode();

				$("#avatarPopup input#rounded").prop("checked", false);
				// TODO: Also set rotation-angle input to 0

				o.options.ratio = img.width / img.height || 1;
				o.options.rounded = false;
				o.options.angle = 0;

				let data = new FormData();
				data.append("type", "icon");
				data.append("image", file);

				$.ajax({
					type: "POST",
					url: "api/upload_create.php",
					data: data,
					contentType: false,
					processData: false,
					success: function(result, status, xhr) {
						_ICONS.unshift(result);
						_MAP.setIcon(o, [ 35, 35 / o.options.ratio ], result);
						_MAP.updateObject(o);

						setTimeout(function() { $("#loadingModal").modal("hide"); }, 750);
					},
					error: function(xhr, status, error) {
						console.error(xhr.status, error);
						setTimeout(function() { $("#loadingModal").modal("hide"); $("#errorModal").modal("show"); }, 750);
					}
				});
			};
			fr.readAsDataURL(file);
		});
		$("#avatarPopup #iconChoose #iconAdd").click(ev => { $("input#_img_icon").click(); });

		$("#avatarPopup #iconChoose #icons").click(async function(ev) {
			let val = $(this).prop("src");

			let img = new Image();
			img.src = val;
			await img.decode();

			o.options.ratio = img.width / img.height || 1;
			_MAP.setIcon(o, [ 35, 35 / o.options.ratio ], val);
			_MAP.updateObject(o);
		});

		$("#avatarPopup input#size").change(function(ev) {
			let val = Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") );

			_MAP.setIcon(o, [ val, val / o.options.ratio ]);
			_MAP.updateObject(o);
		});

		$("#avatarPopup input#rounded").change(function(ev) {
			o.options.rounded = this.checked;

			_MAP.updateObject(o);
			_MAP.setIcon(o);
		});
		$("#avatarPopup input#rounded").prop("checked", o.options.rounded);

		$("#avatarPopup input#color").change(function(ev) {
			let val = $(this).val();

			o.options.borderColor = val;
			_MAP.updateObject(o);
			_MAP.setIcon(o);
		});
		$("#avatarPopup input#color").val(o.options.borderColor || "#563d7c");

		$("#avatarPopup input#thickness").change(function(ev) {
			let val = Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") );

			o.options.borderThickness = val;
			_MAP.updateObject(o);
			_MAP.setIcon(o);
		});

		$("#avatarPopup input#blur").change(function(ev) {
			let val = Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") );

			o.options.overlayBlur = val;
			_MAP.updateObject(o);
			_MAP.setIcon(o);
		});

		$("#avatarPopup input#grayscale").change(function(ev) {
			let val = Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") );

			o.options.overlayGrayscale = val;
			_MAP.updateObject(o);
			_MAP.setIcon(o);
		});

		$("#avatarPopup input#brightness").change(function(ev) {
			let val = Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") );

			o.options.overlayBrightness = val;
			_MAP.updateObject(o);
			_MAP.setIcon(o);
		});

		$("#avatarPopup input#transparency").change(function(ev) {
			let val = Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") );

			o.options.overlayTransparency = val;
			_MAP.updateObject(o);
			_MAP.setIcon(o);
		});
	}else
	if(o instanceof L.Path) {
		$("#shapePopup input#dashed").change(function(ev) {
			o.setStyle({ dashArray: this.checked ? "5, 10" : "" });
			_MAP.updateObject(o);
		});
		$("#shapePopup input#dashed").prop("checked", !!o.options.dashArray);

		$("#shapePopup input#lineColor").change(function(ev) {
			o.setStyle({ color: $(this).val() });
			_MAP.updateObject(o);
		});
		$("#shapePopup input#lineColor").val(o.options.color || "#563d7c");

		$("#shapePopup input#lineThickness").change(function(ev) {
			o.setStyle({
				weight: Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") )
			});
			_MAP.updateObject(o);
		});

		$("#shapePopup input#lineTransparency").change(function(ev) {
			o.setStyle({
				opacity: 1 - Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") )
			});
			_MAP.updateObject(o);
		});

		if(o instanceof L.Rectangle
		|| o instanceof L.Polygon
		|| o instanceof L.Circle) {
			$("#shapePopup input#fillColor").change(function(ev) {
				o.setStyle({ fillColor: $(this).val() });
				_MAP.updateObject(o);
			});
			$("#shapePopup input#fillColor").val(o.options.fillColor || "#563d7c");

			$("#shapePopup input#fillTransparency").change(function(ev) {
				o.setStyle({
					fillOpacity: 1 - Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") )
				});
				_MAP.updateObject(o);
			});
		}
	}else{ console.error("object type invalid"); }

	$(".objectPopup input#animationSpeed").change(function(ev) {
		o.options.animationspeed = Math.min( Math.max( $(this).prop("min"), $(this).val() ), $(this).prop("max") ) * 1000;
		_MAP.updateObject(o);
	});

	$(".objectPopup #makeGlobal").click(function(ev) {
		_MAP.globalObjectOptions(o);
	});
}
