# GeoTales-map

### Datastructure
```javascript
{
	"options": {
		//"aspectratio": 0.0, // maybe remove? One of 16/9, 9/16 and 4/3
		"animationspeed": 0, // speed of map-object animations in ms
		"panningspeed": 0, // speed of map-panning animation in ms
		"objectOptIn": false // whether of not the map-objects are to be automatically added to the next scene when created
	},
	"scenes": [
		{
			"id": "", // uuid – id of scene
			"bounds": [[0, 0], [1, 1]], // 
			"wms": {}, // TODO
			"basemap": {}, // TODO
			"bookmark": true, // whether of not the scene is bookmarked (the bookmarks appear in pres. mode)
			"title": "" // title of the scene (shown in the textbox in the scene element)
		},
		//...
	],
	"textboxes": [
		{
			"id": "", // uuid – id of textbox
			"sceneId": "", // uuid – id of the associated scene
			"locked": true, // whether of not the textbox is locked (locked textboxes will automatically be added to the text scene when created)
			"pos": "", // what position the textbox has, left or right
			"dim": [0, 0], // the dimentions of the textbox, first element is the height in decimal (0-1) and the second is the width (0-1)
			"content": "" // the content of the textbox, in HTML
		},
		//...
	],
	"objects": [
		{
			"id": "", // uuid – id of map object
			"sceneId": "", // uuid – id of the associated scene
			"type": "", // type of the map-object, either avatar, polygon, rectangle, polyline or circle
			"pos": [[]], // the geomatry of the object, is different for each object-type. For avatar [lat,lng], for polygon/rectangle/polyline [[[lat,lng], ...], ...], for circle [lat,lng] plus radius stored in another field
			"label": "", // a small text-string that describes the object
			//... varies based on the type
		},
		//...
	]
}
```
