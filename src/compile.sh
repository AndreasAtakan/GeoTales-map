#!/bin/sh

NOW=$(date +%s)

rm ../assets/main_*.js* ../assets/main_*.css
cp edit/css/main.css ../assets/main_edit_$NOW.css
cp pres/css/main.css ../assets/main_pres_$NOW.css
npm run build
sed -i "s/main.js.map/main_edit_$NOW.js.map/" edit/main.js
cp edit/main.js ../assets/main_edit_$NOW.js
cp edit/main.js.map ../assets/main_edit_$NOW.js.map
sed -i "s/main.js.map/main_pres_$NOW.js.map/" pres/main.js
cp pres/main.js ../assets/main_pres_$NOW.js
cp pres/main.js.map ../assets/main_pres_$NOW.js.map
rm edit/main.js* pres/main.js*

sed -i "s/main_edit_.*.css/main_edit_$NOW.css/" ../edit.php
sed -i "s/main_pres_.*.css/main_pres_$NOW.css/" ../pres.php
sed -i "s/main_edit_.*.js/main_edit_$NOW.js/" ../edit.php
sed -i "s/main_pres_.*.js/main_pres_$NOW.js/" ../pres.php
