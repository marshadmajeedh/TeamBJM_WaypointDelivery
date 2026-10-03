# Store delivery map

The delivery card uses bundled Leaflet with OpenStreetMap standard raster tiles.
No API key, billing account or map environment variables are required.

On the tracking page choose **Set store location**, zoom and click the store on the
map (or type latitude and longitude), then choose **Save store location**. The API
validates the coordinates and limits updates to the authenticated manager's depot.
The change updates the outlet's location for all orders and survives page reloads.
The form displays the store name/address so the selected position can be checked.

Store pins use Outlet.latitude/longitude. Vehicle pins use fresh DELIVERY_TELEMETRY
coordinates from the existing backend. Queries refresh every 30 seconds; marker
updates do not recreate the map or refresh tiles unnecessarily. Stale vehicle data
is hidden. Without coordinates, a labelled Sri Lanka overview is shown, without
fabricated delivery markers, plus an outlet address search link.

The Driver integration still needs to publish GPS. Road-route and ETA calculation
are not included. The existing ETA display uses backend telemetry.

Visible OpenStreetMap attribution is included. Tile requests use the browser's normal
cache and referrer. No tile prefetching, bulk downloads or offline tile caching is
implemented. Public OSM tiles are a best-effort service for modest demo usage, not
unlimited production hosting. For higher traffic select a suitable tile provider
and update both URL and attribution.

- https://leafletjs.com/examples/quick-start/
- https://operations.osmfoundation.org/policies/tiles/
