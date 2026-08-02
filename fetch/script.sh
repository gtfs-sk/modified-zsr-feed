#!/bun/bash

## fetch base feed
mkdir -p ./tmp/feed
curl https://data.slovensko.sk/download?id=57827444-bb2e-4839-b1af-02241179a526 > ./tmp/feed.zip
unzip -o ./tmp/feed.zip -d ./tmp/feed
rm ./tmp/feed.zip

## fetch openstreetmap data
curl https://overpass.kumi.systems/api/interpreter?data=%5Bout%3Ajson%5D%5Btimeout%3A25%5D%3Barea%28id%3A3600014296%29-%3E.searchArea%3B%28nwr%5B%22railway%22%3D%22station%22%5D%28area.searchArea%29%3Bnwr%5B%22railway%22%3D%22halt%22%5D%28area.searchArea%29%3B%29%3Bout%20geom%3B > ./tmp/OSMStops.json

mkdir -p ./data

echo "Feed downloaded and extracted to ./tmp directory."