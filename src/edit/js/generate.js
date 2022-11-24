/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                  *
*******************************************************************************/

"use strict";


export function new_scene(id, prevId) {

	let cont = `
		<li class="list-group-item p-1 my-1" id="${id}" data-id="${id}">
			<div class="input-group input-group-sm">
				<button type="button" class="btn btn-outline-light" id="reorder" title="Change ordering">
					<i class="fas fa-bars"></i>
				</button>
				<input type="text" class="form-control" id="title" aria-label="Title" aria-describedby="num" />
				<span class="input-group-text" id="num"></span>
			</div>
		</li>
	`;

	if(prevId) { $(`li[data-id="${prevId}"]`).after(cont); }
	else{ $("ul#scenes").append(cont); }

}



export function generate_basemaps(isUpload) {
	let html = ``;

	for(let i = 0; i < _BASEMAPS.length; i++) {
		let b = _BASEMAPS[i];
		if(b.name !== "" && isUpload) { continue; }
		html += `
			<div class="col">
				<div class="card mt-2">
					<div class="card-body">
						<h6 class="card-title mb-0">${b.name}</h6>
					</div>
					<img class="card-img-bottom" id="basemaps" src="${b.preview}" alt="${b.name}" data-basemap="${i}" />
				</div>
			</div>
		`;
	}
	if(isUpload) {
		html += `
			<div class="col">
				<div class="card mt-2">
					<div class="card-body">
						<div class="d-grid">
							<button type="button" class="btn btn-outline-secondary" id="uploadBasemap" ${!_USER_PAID ? "disabled" : ""}>+</button>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	$(isUpload ?
		"#basemapModal #imgBasemapChoose" :
		"#basemapModal #basemapChoose").html(html);
}



export function avatar_popup() {

	return `
		<form class="container-fluid objectPopup" id="avatarPopup">
			<div class="row">
				<div class="col">
					<input type="text" class="form-control form-control-sm" id="label" aria-label="label" placeholder="Label" />
				</div>
			</div>

			<div class="row my-3">
				<div class="col">
					<div class="input-group input-group-sm">
						<div class="input-group-text">
							<input type="checkbox" class="form-check-input mt-0" id="rounded" value="" aria-label="Rounded" title="Rounded" />
						</div>
						<input type="number" min="10" max="500" step="1" class="form-control" id="size" placeholder="Size" />
					</div>
				</div>
			</div>

			<div class="row my-3">
				<div class="col">
					<div class="accordion" id="iconAccordion">
						<div class="accordion-item">
							<h2 class="accordion-header" id="iconAccordionHeading">
								<button class="accordion-button collapsed py-1 px-2" type="button" data-bs-toggle="collapse" data-bs-target="#iconAccordionCollapse" aria-expanded="false" aria-controls="iconAccordionCollapse">
									Icon
								</button>
							</h2>
							<div id="iconAccordionCollapse" class="accordion-collapse collapse" aria-labelledby="iconAccordionHeading" data-bs-parent="#iconAccordion">
								<div class="accordion-body py-1" style="max-height: 80px; overflow-y: auto;">
									<div class="row row-cols-5" id="iconChoose">
										<div class="col">
											<button type="button" class="btn btn-sm btn-outline-secondary" id="iconAdd" title="Add icon">+</button>
										</div>
									</div>
								</div>
							</div>
						  </div>
					</div>
				</div>
			</div>

			<div class="row my-3">
				<div class="col">
					<div class="input-group input-group-sm">
						<input type="color" class="form-control form-control-color" id="color" value="#563d7c" title="Choose color" />
						<input type="number" min="0" max="10" class="form-control" id="thickness" placeholder="Thickness" />
					</div>
				</div>
			</div>

			<div class="row my-3">
				<div class="col">
					<div class="input-group input-group-sm">
						<input type="number" min="0" max="3" step="0.1" class="form-control" id="blur" placeholder="Blur" />
						<input type="number" min="0" max="1" step="0.1" class="form-control" id="grayscale" placeholder="Grayscale" />
					</div>
					<div class="input-group input-group-sm">
						<input type="number" min="0" max="6" step="1" class="form-control" id="brightness" placeholder="Brightness" />
						<input type="number" min="0" max="0.9" step="0.1" class="form-control" id="transparency" placeholder="Transparency" />
					</div>
				</div>
			</div>

			<div class="row mb-2">
				<div class="col">
					<input type="number" class="form-control form-control-sm" id="animationSpeed" min="0.1" max="10" step="0.1" aria-label="Animation speed" placeholder="Animation speed (sec.)" title="This objects animation speed to next scene" />
				</div>
			</div>

			<div class="row">
				<div class="col">
					<button type="button" class="btn btn-sm btn-outline-secondary py-0" id="makeGlobal" title="Save options globally">
						<i class="fas fa-save"></i> <strong>*</strong>
					</button>
				</div>
			</div>
		</form>
	`;

}

export function polyline_popup() {

	return `
		<form class="container-fluid objectPopup" id="shapePopup">
			<div class="row">
				<div class="col">
					<input type="text" class="form-control form-control-sm" id="label" aria-label="label" placeholder="Label" />
				</div>
			</div>

			<div class="row my-3">
				<div class="col">
					<div class="input-group input-group-sm">
						<input type="color" class="form-control form-control-color" id="lineColor" value="#563d7c" title="Choose color" />
						<input type="number" min="2" max="10" class="form-control" id="lineThickness" placeholder="Thickness" />
						<input type="number" min="0" max="0.9" step="0.1" class="form-control" id="lineTransparency" placeholder="Transparency" />
					</div>
					<div class="form-check mt-1">
						<input class="form-check-input" type="checkbox" value="" id="dashed">
						<label class="form-check-label" for="dashed">Dashed</label>
					</div>
				</div>
			</div>

			<div class="row mb-2">
				<div class="col">
					<input type="number" class="form-control form-control-sm" id="animationSpeed" min="0.1" max="10" step="0.1" aria-label="Animation speed" placeholder="Animation speed (sec.)" title="This objects animation speed to next scene" />
				</div>
			</div>

			<div class="row">
				<div class="col">
					<button type="button" class="btn btn-sm btn-outline-secondary py-0" id="makeGlobal" title="Save options globally">
						<i class="fas fa-save"></i> <strong>*</strong>
					</button>
				</div>
			</div>
		</form>
	`;

}

export function polygon_popup() {

	return `
		<form class="container-fluid objectPopup" id="shapePopup">
			<div class="row">
				<div class="col">
					<input type="text" class="form-control form-control-sm" id="label" aria-label="label" placeholder="Label" />
				</div>
			</div>

			<div class="row my-3">
				<div class="col">
					<div class="input-group input-group-sm">
						<input type="color" class="form-control form-control-color" id="lineColor" value="#563d7c" title="Choose color" />
						<input type="number" min="2" max="10" class="form-control" id="lineThickness" placeholder="Thickness" />
						<input type="number" min="0" max="0.9" step="0.1" class="form-control" id="lineTransparency" placeholder="Transparency" />
					</div>
					<div class="form-check mt-1">
						<input class="form-check-input" type="checkbox" value="" id="dashed">
						<label class="form-check-label" for="dashed">Dashed</label>
					</div>
				</div>
			</div>

			<div class="row my-3">
				<div class="col">
					<div class="input-group input-group-sm">
						<input type="color" class="form-control form-control-color" id="fillColor" value="#563d7c" title="Choose color" />
						<input type="number" min="0" max="1" step="0.1" class="form-control" id="fillTransparency" placeholder="Transparency" />
					</div>
				</div>
			</div>

			<div class="row mb-2">
				<div class="col">
					<input type="number" class="form-control form-control-sm" id="animationSpeed" min="0.1" max="10" step="0.1" aria-label="Animation speed" placeholder="Animation speed (sec.)" title="This objects animation speed to next scene" />
				</div>
			</div>

			<div class="row">
				<div class="col">
					<button type="button" class="btn btn-sm btn-outline-secondary py-0" id="makeGlobal" title="Save options globally">
						<i class="fas fa-save"></i> <strong>*</strong>
					</button>
				</div>
			</div>
		</form>
	`;

}
