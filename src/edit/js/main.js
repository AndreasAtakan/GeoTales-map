/*******************************************************************************
* Copyright (C) Nordfjord EDB AS - All Rights Reserved                         *
*                                                                              *
* Unauthorized copying of this file, via any medium is strictly prohibited     *
* Proprietary and confidential                                                 *
* Written by Andreas Atakan <aca@geotales.io>, January 2022                    *
*******************************************************************************/

"use strict";

//import "jquery-resizable";

import {
	import_data,
	export_data,
	save_data,
	unsaved_changes,
	init_basemaps
} from "./helpers.js";

import {Prez} from "./prez";


window.onload = function(ev) {
  let prez = new Prez();
};
