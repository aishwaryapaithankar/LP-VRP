/*
 * Copyright 2021 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from "react";
import * as ReactDom from "react-dom";
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { createCustomEqual } from "fast-equals";
import { isLatLngLiteral } from "@googlemaps/typescript-guards";
import axios from 'axios';
// import { withGoogleMap,GoogleMap,DirectionsRenderer } from 'react-google-maps';
const render = (status: Status) => {
  return <h1>{status}</h1>;
};

const App: React.VFC = () => {
  const [clicks, setClicks] = React.useState<google.maps.LatLng[]>([]);
  const [loc, setLoc] = React.useState([]);
  const [points,setPoints] = React.useState([]);
  const [zoom, setZoom] = React.useState(13); // initial zoom
  const [center, setCenter] = React.useState<google.maps.LatLngLiteral>({
    lat: 40.014984,
    lng: -105.270546,
  });
  const [maxlocation, setMaxLocation] = React.useState(5);
  const [capacity, setCapacity] = React.useState(10);
  const [model, setModel] = React.useState("vrp1");
  const [directions, setDirections] = React.useState(null);

  const onClick = async (e: google.maps.MapMouseEvent) => {
    // avoid directly mutating state
    if (loc.length < maxlocation) {
      let data = e.latLng!.toJSON();
      console.log(data);
      setClicks([...clicks, e.latLng!]);

      let response = await axios.get('http://api.positionstack.com/v1/reverse', {
        params: {
          access_key: import.meta.env.VITE_POSITION_STACK_API_KEY,
          query: `${data["lat"]},${data["lng"]}`
        }
      })
      console.log(response.data);
      setLoc([...loc, response.data.data[0].name]);
    }
    else {
      alert("Maximum location limit exceeded");
    }
  };

  const onIdle = (m: google.maps.Map) => {
    console.log("onIdle");
    setZoom(m.getZoom()!);
    setCenter(m.getCenter()!.toJSON());
  };

  const handleSubmit = () => {
    if (loc.length <= maxlocation) {
      let demands: Number[] = [];
      demands.push(0);
      for (let i = 1; i < maxlocation; i++) {
        let x = (document.getElementById("demand" + i) as HTMLInputElement).value;
        demands.push(Number(x));
      }
      console.log(demands);
      
      let locs = [];
      let temp = [];
      clicks.forEach(click => {
        temp = click.toJSON();
        locs.push([temp.lat,temp.lng])
      })
      console.log(locs);
      console.log(capacity);
      console.log(model);
      let data = {
        locations : locs,
        demands : demands,
        capacity: Number(capacity)
      }
      console.log(data);
      let url = new URL('http://10.0.0.54:5000/solve/'+model);
      axios.post(url.toString(), data)
      .then(function (response) {
        console.log(response.data.routes);
        if(response.data.status === "optimal")
        {
          setPoints(response.data.routes);
        }
      })
      .catch(function (error) {
        console.log(error);
      });
    }


  }

  const handleCapacity = (e) =>{
    setCapacity(e.target.value);
  }
  const handleMaximumLocation = (e) => {
    setMaxLocation(e.target.value);
  }
  const handleModelChange = (e) => {
    setModel(e.target.value);
  }
  const form = (
    <div
      style={{
        padding: "1rem",
        flexBasis: "250px",
        height: "100%",
        overflow: "auto",
      }}
    >
      <label htmlFor="maxLocation">Choose Number of Locations:</label>
      <input id="maxLocation" type="number" onChange={handleMaximumLocation}/>
      <p> Depot will be the first location and number of locations includes depot</p>


      <label htmlFor="model">Choose Capacity of vehicle:</label>
      <input id="capacity" type="number" onChange={handleCapacity}/>
     
      <label htmlFor="model">Choose Model:</label>

      <select
        name="model"
        id="model"
        onChange={handleModelChange}>
        <option value={"vrp1"}>vrp1</option>
        <option value={"vrp2"}>Model 2</option>
        <option value={"vrp3"}>Model 3</option>
      </select>
      <h3>{clicks.length === 0 ? "Click on map to add location" : "Locations Selected"}</h3>

      {loc.length > 0 && loc.map((label, i) => (
        <div key={i} className="location-div">
          <p key={"label" + i}>{label}</p>
          <input key={"demand" + i} id={"demand" + i} type="number" />
        </div>
      ))}
      <button onClick={() => { setClicks([]); setLoc([]); }}>Clear</button>
      <button onClick={handleSubmit}>Find Optimal Solution</button>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Wrapper apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY!} render={render} id="map">
        <Map
          center={center}
          onClick={onClick}
          onIdle={onIdle}
          zoom={zoom}
          points= {points}
          directions={directions}
          style={{ flexGrow: "1", height: "100%" }}
        >
          {clicks.map((latLng, i) => (
            <Marker key={i} position={latLng} />
          ))}

        </Map>
      </Wrapper>
      {form}
    </div>
  );
};
interface MapProps extends google.maps.MapOptions {
  style: { [key: string]: string };
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onIdle?: (map: google.maps.Map) => void;
  points;
}
function getRandomColor(i) {
  switch(i){
    case 1: return 'black';
    case 2: return 'red';
    case 3: return 'blue';
    case 4: return 'purple';
    case 5: return 'brown';
    case 6: return 'orange';
    case 7: return 'mustard';
    default: return 'aqua';
  }
}
const Map: React.FC<MapProps> = ({
  onClick,
  onIdle,
  children,
  style,
  points,
  ...options
}) => {

  const ref = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState<google.maps.Map>();
  const directionsService = new google.maps.DirectionsService();
  let bounds = new google.maps.LatLngBounds();
  let delay = 100;
  let nextAddress = 0;

  function calcRoute(coordinates, next,i) {
    const directionsRenderer = new google.maps.DirectionsRenderer({
      suppressBicyclingLayer: true,
      suppressMarkers: true,
      preserveViewport: true, // don't zoom to fit the route
      polylineOptions: { strokeColor: getRandomColor(i) }
    });
    let coordinatesJSON = []
    coordinates.forEach(element => {
      console.log(element)
      coordinatesJSON.push({location:{lat: element[0],lng: element[1]},stopover:true})
    });
    console.log("coordinatesJSON",coordinatesJSON);
    let start = coordinatesJSON.shift().location;
    let end = coordinatesJSON.pop().location;
    console.log("calcRoute('" + start + "','" + end + "',next)");
  directionsService.route({
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING,
        waypoints: coordinatesJSON
      },
      function(result, status) {
        if (status == 'OK') {
          directionsRenderer.setMap(map);
          directionsRenderer.setDirections(result);
          bounds.union(result!.routes[0].bounds);
          // if(map!= undefined){
          // map.fitBounds(bounds);
          // }
        }
        else {
          console.log("status=" + status + " (start=" + start + ", end=" + end + ")");
          if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
            nextAddress--;
            delay += 100;
            console.log("delay between requests=" + delay);
          } else {
            var reason = "Code " + status;
            var msg = 'start="' + start + ' end="' + end + '"" error=' + reason + '(delay=' + delay + 'ms)<br>';
            console.log(msg);
          }
        }
        next();
      });
  }

  


  function theNext() {
      if (nextAddress < points.length) {
        console.log("points",points[nextAddress]);
        let temp = points[nextAddress]
        console.log("temp",temp);
        console.log('call calcRoute("' + temp + ') delay=' + delay);
        setTimeout(()=>{
            calcRoute(temp,theNext,nextAddress);
        },delay);
        nextAddress++;
      } else {
        if(map!= undefined){
          map.fitBounds(bounds);
          }
      }
  }
  React.useEffect(() => {
      console.log(points);
      theNext();
  }, [points]);
  React.useEffect(() => {
    if (ref.current && !map) {
      setMap(new window.google.maps.Map(ref.current, {}));
    }
  }, [ref, map]);

  // because React does not do deep comparisons, a custom hook is used
  // see discussion in https://github.com/googlemaps/js-samples/issues/946
  useDeepCompareEffectForMaps(() => {
    if (map) {
      map.setOptions(options);
    }
  }, [map, options]);

  React.useEffect(() => {
    if (map) {
      ["click", "idle"].forEach((eventName) =>
        google.maps.event.clearListeners(map, eventName)
      );

      if (onClick) {
        map.addListener("click", onClick);
      }

      if (onIdle) {
        map.addListener("idle", () => onIdle(map));
      }
    }
  }, [map, onClick, onIdle]);

  

  return (
    <>
      <div ref={ref} style={style} />
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // set the map prop on the child component
          return React.cloneElement(child, { map });
        }
      })}
    </>
  );
};

const Marker: React.FC<google.maps.MarkerOptions> = (options) => {
  const [marker, setMarker] = React.useState<google.maps.Marker>();

  React.useEffect(() => {
    if (!marker) {
      setMarker(new google.maps.Marker());
    }

    // remove marker from map on unmount
    return () => {
      if (marker) {
        marker.setMap(null);
      }
    };
  }, [marker]);

  React.useEffect(() => {
    if (marker) {
      marker.setOptions(options);
    }
  }, [marker, options]);

  return null;
};

const deepCompareEqualsForMaps = createCustomEqual(
  (deepEqual) => (a: any, b: any) => {
    if (
      isLatLngLiteral(a) ||
      a instanceof google.maps.LatLng ||
      isLatLngLiteral(b) ||
      b instanceof google.maps.LatLng
    ) {
      return new google.maps.LatLng(a).equals(new google.maps.LatLng(b));
    }

    // TODO extend to other types

    // use fast-equals for other objects
    return deepEqual(a, b);
  }
);


function useDeepCompareMemoize(value: any) {
  const ref = React.useRef();

  if (!deepCompareEqualsForMaps(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
}

function useDeepCompareEffectForMaps(
  callback: React.EffectCallback,
  dependencies: any[]
) {
  React.useEffect(callback, dependencies.map(useDeepCompareMemoize));
}

window.addEventListener("DOMContentLoaded", () => {
  ReactDom.render(<App />, document.getElementById("root"));
});


export { };
