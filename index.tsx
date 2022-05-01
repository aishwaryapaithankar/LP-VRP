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
let directionsRenderer = [];
let cnt = 0;
const App: React.VFC = () => {
  const [clicks, setClicks] = React.useState<google.maps.LatLng[]>([]);
  const [loc, setLoc] = React.useState([]);
  const [points, setPoints] = React.useState([]);
  const [zoom, setZoom] = React.useState(13); // initial zoom
  const [center, setCenter] = React.useState<google.maps.LatLngLiteral>({
    lat: 40.014984,
    lng: -105.270546,
  });
  const [maxlocation, setMaxLocation] = React.useState(5);
  const [capacity, setCapacity] = React.useState(10);
  const [numberofvehicle, setNumberofvehicle] = React.useState(1);
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
    document.getElementById("solution").innerHTML = '';
    for (let j = 0; j <= cnt; j++) {
      if (directionsRenderer[j]) {
        directionsRenderer[j].set('directions', null);
      }
    }
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
        locs.push([temp.lat, temp.lng])
      })
      let data;
      if (model === "vrp3") {
        let capacities: Number[] = [];
        for (let i = 0; i < Number(numberofvehicle); i++) {
          let x = (document.getElementById("capacity" + i) as HTMLInputElement).value;
          capacities.push(Number(x));
        }
        console.log(capacities);
        data = {
          locations: locs,
          demands: demands,
          capacity: capacities
        }
      }
      else {
        data = {
          locations: locs,
          demands: demands,
          capacity: Number(capacity)
        }
      }
      console.log(data);
      let url = new URL('http://10.0.0.54:5000/solve/' + model);
      axios.post(url.toString(), data)
        .then(function (response) {
          console.log("ROUTES", response.data.routes);
          if (response.data.status === "optimal") {
            setPoints(response.data.routes);
            let temp;
            response.data.lengths.forEach((element, i) => {
              temp = document.createElement('div');
              temp.style.cssText = "color:" + getRandomColor(i + 1) + ";";
              temp.innerHTML = `Route ${i + 1} Length: ${element} meters`;
              document.getElementById("solution")?.appendChild(temp);

            });

          }
          else {
            alert(response.data.status);
          }

        })
        .catch(function (error) {
          console.log(error);
        });
    }



  }

  const handleCapacity = (e) => {
    setCapacity(e.target.value);
  }
  const handleMaximumLocation = (e) => {
    setMaxLocation(e.target.value);
  }
  const handleModelChange = (e) => {
    setModel(e.target.value);
  }
  const handleNumberofVehicle = (e) => {

    setNumberofvehicle(e.target.value);
  }
  const HandleClear = (e) => {
    document.getElementById("solution").innerHTML = '';
    setClicks([]);
    setLoc([]);
    console.log("cnt", cnt);
    for (let j = 0; j <= cnt; j++) {
      // directionsRenderer.set('directions', null);
      if (directionsRenderer[j]) {
        directionsRenderer[j].set('directions', null);
        directionsRenderer[j].setMap(null);
        directionsRenderer[j] = null;
      }
    }
    cnt = 0;
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

      <label htmlFor="model">Choose Model:</label>

      <select
        name="model"
        id="model"
        onChange={handleModelChange}>
        <option value={"vrp1"}>Two-Index Vehicle Flow Model (ACVRP/SCVRP)</option>
        <option value={"vrp4"}>Two-Index Commodity Flow Model (SCVRP)</option>
        <option value={"vrp3"}>Three-Index Vehicle Flow Model (ACVRP/SCVRP)</option>
      </select>

      <label htmlFor="maxLocation">Choose Number of Locations:</label>
      <input id="maxLocation" type="number" onChange={handleMaximumLocation} />
      <p> Depot will be the first location and number of locations includes depot</p>

      {model != "vrp3" && <div><label htmlFor="model">Choose Capacity of vehicle:</label>
        <input id="capacity" type="number" onChange={handleCapacity} /></div>}
      {model == "vrp3" &&
        <div className="vehicle-container">
          <label htmlFor="model">Choose Number of vehicle:</label>
          <input id="numberofvehicle" type="number" onChange={handleNumberofVehicle} />
          <div className="location-div" >
            <p ><b>Vehicle Number</b></p>
            <p><b> Capacity</b> </p>
          </div>
          {Array.from([...Array(Number(numberofvehicle)).keys()]).map((i) => (
            <div key={i} className="location-div" >
              <p key={"vehicle" + i}>Vehicle {i + 1}</p>
              <input key={"capacity" + i} id={"capacity" + i} type="number" />
            </div>
          ))}
        </div>}



      <h3>{clicks.length === 0 ? "Click on map to add location" : "Locations Selected"}</h3>
      <div className="location-container">
        <div className="location-div" >
          <p ><b>Location</b></p>
          <p><b> Demand</b> </p>
        </div>
        {loc.length > 0 && loc.map((label, i) => (
          <div key={i} className="location-div" >
            <p key={"label" + i}>{label}</p>
            <input key={"demand" + i} id={"demand" + i} type="number" />
          </div>
        ))}
      </div>

      {/* {model==="vrp3"} */}

      <button onClick={HandleClear}>Clear</button>
      <button onClick={handleSubmit}>Find Optimal Solution</button>
      <div id="solution"></div>
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
          points={points}
          directions={directions}
          style={{ height: "100%", width: "1100px" }}
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
  switch (i) {
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

// function getSVGPath(i) {
//   switch (i) {
//     case 1: return 'M 7.84 14 L 0.8 14 L 0.8 12.4 L 3.66 12.4 L 3.66 2.3 L 0.98 4.32 L 0 2.98 L 4.14 0 L 5.46 0 L 5.46 12.4 L 7.84 12.4 L 7.84 14 Z';
//     case 2: return 'M 8.18 14.24 L 0.06 14.24 Q 0 13.88 0 13.5 A 6.438 6.438 0 0 1 0.127 12.195 A 5.163 5.163 0 0 1 0.45 11.17 Q 0.9 10.14 1.62 9.29 Q 2.34 8.44 3.15 7.71 Q 3.96 6.98 4.67 6.31 A 9.244 9.244 0 0 0 5.354 5.595 A 7.12 7.12 0 0 0 5.84 4.96 Q 6.3 4.28 6.3 3.54 A 1.856 1.856 0 0 0 6.135 2.751 A 1.828 1.828 0 0 0 5.68 2.15 A 2.145 2.145 0 0 0 4.617 1.646 A 3.002 3.002 0 0 0 4.08 1.6 A 3.707 3.707 0 0 0 3.089 1.729 A 3.256 3.256 0 0 0 2.55 1.93 A 5.073 5.073 0 0 0 1.392 2.7 A 5.765 5.765 0 0 0 1.26 2.82 L 0.26 1.6 Q 1.06 0.88 2.03 0.44 A 4.826 4.826 0 0 1 3.291 0.073 A 6.459 6.459 0 0 1 4.28 0 Q 5.46 0 6.34 0.45 A 3.557 3.557 0 0 1 7.317 1.172 A 3.273 3.273 0 0 1 7.71 1.68 Q 8.2 2.46 8.2 3.42 A 3.848 3.848 0 0 1 7.78 5.2 A 6.956 6.956 0 0 1 6.782 6.65 A 7.737 7.737 0 0 1 6.7 6.74 Q 6.04 7.46 5.28 8.13 Q 4.52 8.8 3.82 9.5 A 9.186 9.186 0 0 0 2.905 10.561 A 8.058 8.058 0 0 0 2.63 10.96 Q 2.14 11.72 2.02 12.6 L 8.18 12.6 L 8.18 14.24 Z';
//     case 3: return 'M 0 13.28 L 0.82 11.78 Q 1.38 12.2 2.12 12.52 A 3.642 3.642 0 0 0 2.884 12.75 Q 3.357 12.84 3.92 12.84 A 4.03 4.03 0 0 0 4.78 12.754 Q 5.511 12.594 6.01 12.14 A 2.295 2.295 0 0 0 6.648 11.203 A 2.386 2.386 0 0 0 6.78 10.4 Q 6.78 9.66 6.38 9.05 A 2.438 2.438 0 0 0 5.794 8.437 Q 5.513 8.226 5.15 8.06 A 3.731 3.731 0 0 0 4.395 7.814 Q 4.018 7.731 3.575 7.7 A 8.071 8.071 0 0 0 3 7.68 L 1.88 7.68 L 1.88 6.22 L 2.92 6.22 Q 3.82 6.22 4.481 6.011 A 3.189 3.189 0 0 0 4.87 5.86 Q 5.64 5.5 6.02 4.92 Q 6.4 4.34 6.4 3.7 A 2.014 2.014 0 0 0 6.254 2.922 A 1.884 1.884 0 0 0 5.69 2.18 A 2.551 2.551 0 0 0 4.379 1.628 A 3.377 3.377 0 0 0 3.94 1.6 Q 3 1.6 2.27 1.91 A 6.232 6.232 0 0 0 1.721 2.173 Q 1.451 2.321 1.232 2.482 A 3.365 3.365 0 0 0 1.08 2.6 L 0.34 1.18 Q 0.799 0.874 1.458 0.573 A 13.313 13.313 0 0 1 1.88 0.39 A 4.919 4.919 0 0 1 2.969 0.086 Q 3.473 0.003 4.043 0 A 8.105 8.105 0 0 1 4.08 0 A 6.061 6.061 0 0 1 5.086 0.079 Q 5.774 0.195 6.32 0.48 A 3.875 3.875 0 0 1 7.176 1.078 A 3.28 3.28 0 0 1 7.73 1.75 Q 8.22 2.54 8.22 3.46 A 3.906 3.906 0 0 1 8.115 4.388 A 2.917 2.917 0 0 1 7.63 5.44 Q 7.04 6.24 5.96 6.76 A 4.962 4.962 0 0 1 7.052 7.331 A 3.959 3.959 0 0 1 7.93 8.17 A 3.46 3.46 0 0 1 8.639 10.263 A 4.282 4.282 0 0 1 8.64 10.34 Q 8.64 11.38 8.13 12.33 A 3.76 3.76 0 0 1 7.004 13.601 A 4.739 4.739 0 0 1 6.57 13.88 A 4.228 4.228 0 0 1 5.46 14.311 Q 4.761 14.48 3.9 14.48 Q 2.697 14.48 1.785 14.18 A 4.795 4.795 0 0 1 1.64 14.13 Q 0.68 13.78 0 13.28 Z';
//     case 4: return 'M 7.78 14.14 L 5.98 14.14 L 5.98 11.16 L 0 11.16 L 0 9.72 L 4.18 0 L 5.74 0.66 L 1.96 9.52 L 5.98 9.52 L 5.98 5.54 L 7.78 5.54 L 7.78 9.52 L 9.44 9.52 L 9.44 11.16 L 7.78 11.16 L 7.78 14.14 Z';
//     case 5: return 'M 0 13.2 L 0.94 11.66 A 5.779 5.779 0 0 0 2.095 12.296 A 6.434 6.434 0 0 0 2.18 12.33 A 3.78 3.78 0 0 0 3.094 12.561 A 4.884 4.884 0 0 0 3.72 12.6 A 3.79 3.79 0 0 0 4.67 12.487 A 2.736 2.736 0 0 0 5.88 11.83 A 2.561 2.561 0 0 0 6.698 9.972 A 3.426 3.426 0 0 0 6.7 9.86 Q 6.7 8.62 5.85 7.83 Q 5 7.04 3.42 7.04 L 0.94 7.04 L 0.94 0 L 7.86 0 L 7.86 1.62 L 2.64 1.62 L 2.64 5.42 L 3.64 5.42 A 7.54 7.54 0 0 1 4.876 5.516 Q 5.668 5.648 6.31 5.96 A 4.279 4.279 0 0 1 7.394 6.7 A 3.753 3.753 0 0 1 8.01 7.46 A 4.005 4.005 0 0 1 8.584 9.261 A 4.941 4.941 0 0 1 8.6 9.66 A 5.009 5.009 0 0 1 8.428 10.996 A 4.22 4.22 0 0 1 7.99 12.03 Q 7.38 13.06 6.28 13.65 A 4.885 4.885 0 0 1 4.757 14.157 A 6.471 6.471 0 0 1 3.7 14.24 Q 2.48 14.24 1.6 13.97 Q 0.72 13.7 0 13.2 Z';
//     case 6: return 'M 7.94 0.04 L 7.94 1.68 A 4.154 4.154 0 0 0 7.771 1.663 Q 7.68 1.655 7.58 1.65 Q 7.38 1.64 7.2 1.64 Q 5.02 1.64 3.61 2.97 A 5.377 5.377 0 0 0 2.229 5.142 A 7.588 7.588 0 0 0 1.88 6.62 Q 2.405 6.114 3.21 5.688 A 8.453 8.453 0 0 1 3.32 5.63 A 4.099 4.099 0 0 1 4.709 5.216 A 5.116 5.116 0 0 1 5.32 5.18 A 4.126 4.126 0 0 1 6.535 5.354 A 3.626 3.626 0 0 1 7.32 5.7 Q 8.2 6.22 8.71 7.15 A 4.039 4.039 0 0 1 9.136 8.378 A 5.48 5.48 0 0 1 9.22 9.36 A 6.124 6.124 0 0 1 9.073 10.73 A 4.852 4.852 0 0 1 8.63 11.93 A 4.456 4.456 0 0 1 7.446 13.365 A 4.328 4.328 0 0 1 7.02 13.66 Q 6 14.28 4.68 14.28 Q 3.42 14.28 2.35 13.65 A 4.052 4.052 0 0 1 1.106 12.492 A 5.45 5.45 0 0 1 0.64 11.7 A 5.838 5.838 0 0 1 0.203 10.411 Q 0.063 9.782 0.02 9.049 A 11.635 11.635 0 0 1 0 8.36 A 11.465 11.465 0 0 1 0.275 5.82 A 10.361 10.361 0 0 1 0.45 5.15 A 8.113 8.113 0 0 1 1.472 2.947 A 7.529 7.529 0 0 1 1.81 2.48 Q 2.72 1.32 4.06 0.66 Q 5.4 0 7.18 0 Q 7.36 0 7.57 0.01 A 6.098 6.098 0 0 1 7.744 0.021 Q 7.85 0.029 7.94 0.04 Z M 1.84 8.22 L 1.84 8.66 Q 1.88 10.54 2.71 11.59 A 2.997 2.997 0 0 0 3.403 12.24 A 2.405 2.405 0 0 0 4.76 12.64 A 2.646 2.646 0 0 0 5.705 12.478 A 2.352 2.352 0 0 0 6.69 11.76 A 3.143 3.143 0 0 0 7.385 10.129 A 4.185 4.185 0 0 0 7.42 9.58 A 3.935 3.935 0 0 0 7.322 8.675 A 2.737 2.737 0 0 0 6.72 7.48 A 2.303 2.303 0 0 0 5.074 6.687 A 3.186 3.186 0 0 0 4.86 6.68 Q 4 6.68 3.22 7.1 Q 2.44 7.52 1.84 8.22 Z';
//     case 7: return 'M 4.06 14 L 2.04 14 A 29.431 29.431 0 0 1 2.099 12.085 Q 2.164 11.099 2.298 10.229 A 17.373 17.373 0 0 1 2.35 9.91 A 17.157 17.157 0 0 1 2.787 8.007 A 13.596 13.596 0 0 1 3.25 6.68 Q 3.84 5.24 4.72 4.02 Q 5.6 2.8 6.74 1.64 L 0 1.64 L 0 0 L 8.88 0 L 8.88 1.44 Q 7.5 2.78 6.58 4.05 Q 5.66 5.32 5.1 6.73 A 12.156 12.156 0 0 0 4.571 8.43 A 15.578 15.578 0 0 0 4.3 9.91 A 24.606 24.606 0 0 0 4.136 11.564 Q 4.079 12.412 4.065 13.358 A 42.649 42.649 0 0 0 4.06 14 Z';
//     default: return 'M 3.727 14.381 A 7.516 7.516 0 0 0 4.98 14.48 A 6.844 6.844 0 0 0 5.893 14.421 A 5.361 5.361 0 0 0 7.44 13.98 A 4.849 4.849 0 0 0 7.671 13.866 A 4.014 4.014 0 0 0 9.14 12.57 A 3.472 3.472 0 0 0 9.569 11.702 A 3.93 3.93 0 0 0 9.76 10.46 A 4.221 4.221 0 0 0 9.757 10.299 A 3.324 3.324 0 0 0 8.98 8.23 A 4.22 4.22 0 0 0 8.675 7.904 Q 8.273 7.516 7.732 7.189 A 7.71 7.71 0 0 0 6.72 6.68 A 5.914 5.914 0 0 0 7.455 6.247 A 4.503 4.503 0 0 0 8.38 5.4 A 2.491 2.491 0 0 0 8.428 5.34 Q 8.777 4.884 8.913 4.27 A 3.922 3.922 0 0 0 9 3.42 Q 9 2.46 8.47 1.68 A 3.379 3.379 0 0 0 7.928 1.061 A 3.909 3.909 0 0 0 7 0.45 A 4.431 4.431 0 0 0 5.917 0.099 A 5.815 5.815 0 0 0 4.82 0 A 5.575 5.575 0 0 0 4.331 0.021 A 4.611 4.611 0 0 0 2.75 0.44 A 4.346 4.346 0 0 0 2.469 0.586 A 3.579 3.579 0 0 0 1.28 1.65 Q 0.74 2.42 0.74 3.44 Q 0.74 4.58 1.31 5.35 Q 1.635 5.789 2.12 6.167 A 6.088 6.088 0 0 0 2.94 6.7 Q 2.109 7.061 1.52 7.512 A 4.079 4.079 0 0 0 0.71 8.32 A 3.521 3.521 0 0 0 0.201 9.295 A 4.001 4.001 0 0 0 0 10.58 Q 0 11.66 0.61 12.55 Q 1.22 13.44 2.34 13.96 Q 2.97 14.253 3.727 14.381 Z M 5 12.88 A 4.013 4.013 0 0 0 5.93 12.778 A 2.871 2.871 0 0 0 7.1 12.21 A 2.252 2.252 0 0 0 7.688 11.501 A 2.148 2.148 0 0 0 7.92 10.5 A 2.093 2.093 0 0 0 7.462 9.198 A 3.075 3.075 0 0 0 7.07 8.78 A 5.313 5.313 0 0 0 6.237 8.178 Q 5.587 7.792 4.72 7.48 Q 3.96 7.66 3.3 8.04 Q 2.64 8.42 2.24 8.98 Q 1.84 9.54 1.84 10.26 Q 1.84 11 2.25 11.6 A 2.694 2.694 0 0 0 3.163 12.427 A 3.289 3.289 0 0 0 3.38 12.54 A 3.553 3.553 0 0 0 4.508 12.853 A 4.396 4.396 0 0 0 5 12.88 Z M 5.08 6.02 Q 5.96 5.72 6.61 5.1 A 2.079 2.079 0 0 0 7.122 4.356 A 2.043 2.043 0 0 0 7.26 3.6 A 1.964 1.964 0 0 0 7.054 2.695 A 2.014 2.014 0 0 0 6.56 2.08 Q 5.86 1.48 4.82 1.48 A 3.222 3.222 0 0 0 4.064 1.564 A 2.324 2.324 0 0 0 3.14 2.01 A 1.68 1.68 0 0 0 2.487 3.229 A 2.119 2.119 0 0 0 2.48 3.4 Q 2.48 4.26 3.19 4.96 A 3.925 3.925 0 0 0 4.138 5.64 Q 4.561 5.861 5.072 6.018 A 6.503 6.503 0 0 0 5.08 6.02 Z';
//   }
// }

// function getSVG(i) {
//   return {
//     path: getSVGPath(i),
//     strokeColor: getRandomColor(i),
//     fillColor: getRandomColor(i),
//     fillOpacity: 1
//   }
// }
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

  function calcRoute(coordinates, next, i) {

    directionsRenderer[cnt] = new google.maps.DirectionsRenderer({
      suppressBicyclingLayer: true,
      suppressMarkers: true,
      preserveViewport: true, // don't zoom to fit the route
      // polylineOptions: {
      //   strokeColor: getRandomColor(i), icons: [
      //     {
      //       icon: getSVG(i),
      //       offset: "50%",
      //       repeat: '0'
      //     }]
      // },
      polylineOptions: {
        strokeColor: getRandomColor(i)

      },
      // panel: document.getElementById("solution")
    });

    let coordinatesJSON = []
    coordinates.forEach(element => {
      console.log(element)
      coordinatesJSON.push({ location: { lat: element[0], lng: element[1] }, stopover: true })
    });
    console.log("coordinatesJSON", coordinatesJSON);
    let start = coordinatesJSON.shift().location;
    let end = coordinatesJSON.pop().location;
    console.log("calcRoute('" + start + "','" + end + "',next)");
    directionsService.route({
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
      waypoints: coordinatesJSON
    },
      function (result, status) {
        if (status == 'OK') {
          directionsRenderer[cnt].setMap(map);
          directionsRenderer[cnt].setDirections(result);
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
      console.log("points", points[nextAddress]);
      let temp = points[nextAddress]
      console.log("temp", temp);
      console.log('call calcRoute("' + temp + ') delay=' + delay);
      setTimeout(() => {
        calcRoute(temp, theNext, nextAddress);
      }, delay);
      cnt++;
      nextAddress++;
    } else {
      if (map != undefined) {
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
