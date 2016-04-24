#!/usr/bin/env bash
#
# have to be installed
# https://www.npmjs.com/package/minifier

#cleanup
rm -fr ../transferYang_deploy
rm -fr ../transferYang_deploy.zip

# make tmp dir
mkdir -p ../transferYang_deploy

# minify js/css
minify --output ../transferYang_deploy/yang.css yang.css
minify --output ../transferYang_deploy/yang.js yang.js
minify --output ../transferYang_deploy/background.js background.js

# move other files and images
cp manifest.json ../transferYang_deploy/manifest.json
cp jquery.min.js ../transferYang_deploy/jquery.min.js
mkdir -p ../transferYang_deploy/images
cp images/*.* ../transferYang_deploy/images

# create zip for sharing
cd ../transferYang_deploy
zip -r ../transferYang_deploy.zip .