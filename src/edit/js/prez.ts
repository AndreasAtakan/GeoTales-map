import { MMap } from "./map";
import { Scenes } from "./scenes";
import { Textboxes } from "./textboxes";
import $ from 'jquery';
import { export_data, import_data, init_basemaps, save_data } from "./helpers";
import { FreeCameraOptions } from "mapbox-gl";

export class Prez {
    map: MMap;
    scenes: Scenes;
    textboxes: Textboxes;

    constructor() {
        console.log("prez init ...");

        let scenes = this.scenes = new Scenes();
        let textboxes = this.textboxes = new Textboxes();
        let map = this.map = new MMap();

        let scene_row = document.getElementById("sceneRow") as HTMLDivElement;
        scene_row.onkeydown = ev => { if (["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", "Space"].indexOf(ev.code) > -1) { ev.preventDefault(); } };
        scene_row.onkeyup = ev => {
            let keycode = ev.code;
            if (keycode == "ArrowLeft") { ev.preventDefault(); scenes.prev(); }
            if (keycode == "ArrowRight") { ev.preventDefault(); scenes.next(); }
            if (["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", "Space"].indexOf(keycode) > -1) { ev.preventDefault(); }
        };

        $("#sceneRow button#add").click(_ => { scenes.add(); });
        $("#sceneRow button#recapture").click(_ => { scenes.capture(); });
        $("#sceneWarningModal button#delete").click(_ => { scenes.delete(); $("#sceneWarningModal").modal("hide"); });

        document.addEventListener("_setup", _ => {
            map.setup();
            textboxes.setup();
            scenes.setup();
        });
        document.addEventListener("_reset", _ => {
            scenes.reset();
            textboxes.reset();
            map.reset();
        });

        $("#optionsModal input#animationSpeed").change(function (ev) { _OPTIONS.animationspeed = $(this).val() * 1000; });
        $("#optionsModal input#panningSpeed").change(function (ev) { _OPTIONS.panningspeed = $(this).val() || null; });
        $("#optionsModal select#aspectRatio").change(function (ev) { _MAP.setAspectRatio(eval(this.value)); });
        $("#optionsModal input#objectsOptIn").change(function (ev) { _OPTIONS.objectOptIn = this.checked; });

        init_basemaps();

        $("#basemapModal input#basemapFile").change(ev => {
            let file = $(ev.target)[0].files[0];
            if (!file) { return; }

            $("#loadingModal").modal("show");

            let data = new FormData();
            data.append("type", "basemap");
            data.append("image", file);

            $.ajax({
                type: "POST",
                url: "api/upload_create.php",
                data: data,
                contentType: false,
                processData: false,
                success: async function (result, status, xhr) {
                    map.setBasemap({ type: "image", img: result });
                    scenes.setBasemap();
                    _BASEMAPS.push({
                        name: "",
                        tiles: { type: "image", img: result },
                        preview: result
                    });
                    setTimeout(function () { $("#loadingModal").modal("hide"); }, 750);
                },
                error: function (xhr, status, error) {
                    console.error(xhr.status, error);
                    setTimeout(function () { $("#loadingModal").modal("hide"); $("#errorModal").modal("show"); }, 750);
                }
            });
        });

        $("#basemapModal button#basemapFetch").click(ev => {
            let url = $("#basemapModal input#basemapLink").val();
            if (!url) { return; }

            let protocol = url.split(/\:/ig)[0];
            if (protocol == "mapbox") {
                let username = url.split(/mapbox\:\/\/styles\//ig)[1].split(/\//ig)[0], styleID = url.split(/mapbox\:\/\/styles\//ig)[1].split(/\//ig)[1],
                    key = $("#basemapModal input#basemapKey").val();
                if (!key) { return; }

                url = `https://api.mapbox.com/styles/v1/${username}/${styleID}/tiles/256/{z}/{x}/{y}?access_token=${key}`;
            }

            map.setBasemap({ type: "tiles", url: url });
            scenes.setBasemap();
        });

        $("#basemapModal button#wmsAdd").click(ev => {
            let url = $("#basemapModal input#wmsLink").val(),
                layers = $("#basemapModal input#wmsLayer").val(),
                format = $("#basemapModal select#wmsFormat").val(),
                version = $("#basemapModal select#wmsVersion").val();
            if (!url || !layers) { return; }

            map.setWMS({
                type: "wms",
                url: url,
                layers: layers,
                format: format,
                version: version,
                transparent: format == "image/png"
            });
            scenes.setWMS();
        });
        $("#basemapModal button#wmsRemove").click(ev => {
            map.setWMS(null);
            scenes.setWMS();
        });


        $("#projectFileInput").change(ev => {
            let file = $(ev.target)[0].files[0];
            if (!file) { return; }

            let fr = new FileReader();
            fr.onload = function () {
                import_data("project", JSON.parse(fr.result as string));
            };
            fr.readAsText(file);
        });
        $("#geojsonImportModal button#import").click(ev => {
            $("#geojsonImportModal").modal("hide");

            let file = $("#geojsonImportModal input#fileInput")[0].files[0];
            if (!file) { return; }

            let options = {
                lineColor: $("#geojsonImportModal #lineColor").val(),
                lineThickness: $("#geojsonImportModal #lineThickness").val() || 3,
                lineTransparency: $("#geojsonImportModal #lineTransparency").val(),
                fillColor: $("#geojsonImportModal #fillColor").val(),
                fillTransparency: $("#geojsonImportModal #fillTransparency").val() || 0.8
            };

            let fr = new FileReader();
            fr.onload = function () {
                import_data("geojson", JSON.parse(fr.result as string), options);
            };
            fr.readAsText(file);
        });
        $("#gedcomImportModal button#import").click(ev => {
            $("#gedcomImportModal").modal("hide");

            let file = $("#gedcomImportModal input#fileInput")[0].files[0];
            if (!file) { return; }

            let options = {};

            let fr = new FileReader();
            fr.onload = function () { import_data("gedcom", fr.result, options); };
            fr.readAsText(file);
        });


        $("button#export").click(ev => {
            export_data($(ev.target).data("type") || null);
        });

        $("a#save").click(ev => {
            $("#loadingModal").modal("show");
            save_data(function () { $("#loadingModal").modal("hide"); });
        });
        setInterval(save_data, 5 * 60 * 1000);

        this.map.once("idle", async () => {
            // 0.5388888888888889, 0.34342211400089906, 0.06754758580881544
            // const vp = new FreeCameraOptions([0.2, 0.2, 0.1],
            //                                  [0.0, 1.2, 0.3, 0.5]);
            // const vp = new FreeCameraOptions([0.5388888888888889, 0.34342211400089906, 0.06754758580881544],
            //                                  [0.5, 0.1, 0.9, 1.0]);
            const vp = new FreeCameraOptions([0.5388888888888889, 0.34342211400089906, 0.06754758580881544],
                                             [-0.25, 0, 0, 1]);
            await this.map.goto(vp, 10.0);
        });
    }
};
