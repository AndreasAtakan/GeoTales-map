//

"use strict";

$.ajaxSetup({
	headers: { 'X-CSRF-TOKEN': $("meta[name=\"csrf-token\"]").prop("content") }
});
