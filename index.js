let data_table = null;
let map = undefined;
var overlay = undefined;
let year_filter = undefined;
let is_play_btn = true;
let timeline_timer = undefined;
let isDrawn = true;
let update_timeline_freq = 10;
let terror = undefined;
let bounds_check_freq = undefined;
const data_per_zoom = []
const terrorFiltered = []
const years_per_zoom = []

/* 

In Add markers, only push variables to data which fall within the camera coordinates


*/

/* function createGoogleMapPointer(lat, lng) {
    var myLatLng = { lat, lng };
    var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        title: 'Hello World!'
    });
} */
d3.csv("/data/terrorism.csv", function (error, data) {
    if (error) throw error;
    terror = data;
    if (loadData()) {
        if (map != null) {
            addMarkers();
            createChart();
        }
    }
});


function initMap() {
    const latlng = { lat: 51.5074, lng: 0.1278 };
    map = new google.maps.Map(d3.select("#map").node(), {
        zoom: 4,
        center: latlng,
    });

    //google.maps.event.addListenerOnce(map, 'idle', function () {
    //currentGMapZoom = map.getZoom();
    //camera_bounds = map.getBounds(); 
    //});


    google.maps.event.addListener(map, 'bounds_changed', function () {
        //window.clearTimeout(bounds_check_freq);
        //bounds_check_freq = window.setTimeout(function () {
            addMarkers();
        //}, 20);
    });
}

function disableMap(disable) {
    map != null ? map.setOptions({
        draggable: !disable, zoomControl: !disable,
        scrollwheel: !disable, disableDoubleClickZoom: disable
    })
        : console.log("map not created");
}


$(document).ready(() => {

    year_filter = $("#yearSlider").prop('min');
    $("#yearSlider").val(year_filter);
    $("#yearSlider").change(e => {
        year_filter = e.target.value;
        addMarkers();
        console.log(year_filter);
    });
    $("#playPause").click(() => {
        if (is_play_btn) {
            timeline_timer = setInterval(myTimer, 10);
            is_play_btn = false;
        } else {
            timeline_timer = clearInterval(timeline_timer);
            is_play_btn = true;
        }
    });
    $("#fastForward").click(() => {
        if (update_timeline_freq > 1) {
            if (update_timeline_freq >= 40) {
                update_timeline_freq -= 5;
                return;
            }
            if (update_timeline_freq >= 30) {
                update_timeline_freq -= 2;
                return;
            }
            if (update_timeline_freq >= 10) {
                update_timeline_freq -= 1;
                return;
            }
            update_timeline_freq -= 0.5;
        }
    });
    $("#slowDown").click(() => {
        if (update_timeline_freq < 60) {
            if (update_timeline_freq >= 40) {
                update_timeline_freq += 5;
                return;
            }
            if (update_timeline_freq >= 30) {
                update_timeline_freq += 2;
                return;
            }
            if (update_timeline_freq >= 10) {
                update_timeline_freq += 1;
                return;
            }
            update_timeline_freq += 0.5;
        }
    });

    data_table = $('#table').DataTable({
        //data: points_array,
        //:true,
        columns: [
            { "title" : "ID",data: 'eventid' }, 
            { "title" : "Year",data: 'iyear' }, 
            { "title" : "Country",data: 'country_txt' },
            { "title" : "Region",data: 'region_txt' },
            { "title" : "City",data: 'city' },
            { "title" : "Latitude",data: 'latitude' },
            { "title" : "Longitude",data: 'longitude' },
            { "title" : "Attack Type",data: 'attacktype1_txt' },
            { "title" : "Target",data: 'targtype1_txt' }, 
            { "title" : "Target Type",data: 'target1' }, 
            { "title" : "Nationality",data: 'natlty1_txt' },
            { "title" : "Group",data: 'gname' }
        ]
    });

})

let timeline_iteration = 0;
function myTimer() {
    if (isDrawn) {
        if (timeline_iteration >= update_timeline_freq) {
            timeline_iteration = 0;
            if (year_filter > $("#yearSlider").prop('max')) {
                year_filter = $("#yearSlider").prop('min');
            }
            $("#yearSlider").val(year_filter);
            addMarkers();
            year_filter++;
        }
        timeline_iteration++;
    }
}
//loop over terror x times
//each loop store all the different filterings




function loadData() {
    console.log(terror)
    terror.forEach(d => {
        const { iyear, country, city, latitude, longitude } = d;
        //data filtering 
        if (!latitude || !longitude || !iyear) {
            return;
        }
        terrorFiltered.push(d)
    });

    //console.log(terror)
    const max_zoom = 25;

    for (i = max_zoom; i >= 0; i--) {
        data_per_zoom[i] = terrorFiltered
    }
    node_merge_amount = 0;

    for (i = max_zoom; i >= 0; i--) {
        let years = {}
        if(i <= 1 ) {
            node_merge_amount = Number.MAX_SAFE_INTEGER;
        }
        else if (i <= 3) {
           //node_merge_amount += 2;
           node_merge_amount += 3;
        }
        else if (i <= 5) {
            //node_merge_amount += 7;
            node_merge_amount += 2;
        }
        else if (i <= 7) {
            node_merge_amount += 1;
            //node_merge_amount += 1;
        }

        data_per_zoom[i].forEach(d => {
            const { iyear, country, city, latitude, longitude } = d;

            if (years[iyear] == undefined) {
                years[iyear] = {}
            }

            let coord_lat = parseFloat(latitude).toFixed(1)
            let coord_lng = parseFloat(longitude).toFixed(1)

            if (node_merge_amount > 0) {
                offset_lat = (coord_lat % node_merge_amount);
                offset_lng = (coord_lng % node_merge_amount);
            } else {
                offset_lat = 0;
                offset_lng = 0;
            }
            coord_lat -= offset_lat
            coord_lng -= offset_lng

            const coords = years[iyear];

            const search_coord_string = coord_lat + "," + coord_lng
            if (coords[search_coord_string] === undefined) {
                coords[search_coord_string] = {
                    coord_lat, coord_lng,
                    latitude, longitude,
                    points: [],
                    count: 0,
                }
            }
            coords[search_coord_string].points.push(d)
            coords[search_coord_string].count += 1;

            return years;
        });

        years_per_zoom[i] = years

    }
    years_per_zoom.forEach(years => {
        for (iyear in years) {
            const year = years[iyear]
            for (ipoint in year) {
                const point = year[ipoint];
                let sumlat=0,sumlong =0;
                length = point.points.length
                for(i = 0; i < point.points.length; i++) {
                    sumlat += parseFloat(point.points[i].latitude);
                    sumlong+= parseFloat(point.points[i].longitude);
                }
               // console.log(point.points)
               // console.log("length" + length)
               // console.log("sumlat" + sumlat)
               // console.log("sumlong" + sumlong)

                sumlat = sumlat / length;
                sumlong = sumlong / length;

                point.coord_lat = sumlat;
                point.coord_lng = sumlong;
            }
        }
    })

    //console.log(years_per_zoom)

    return (true);
}


function addMarkers() {
    isDrawn = false;
    //disableMap(true);
    if (overlay!= null && map != null) {
        overlay.setMap(null);
        overlay = null;
    }
    overlay = new google.maps.OverlayView();

    data = []

    const zoomlevel = map.getZoom();
    console.log(zoomlevel)
    const coords2 = years_per_zoom[zoomlevel]
    if (coords2 == null) {
        isDrawn = true;
        return;
    }

    const coords = coords2[year_filter]

    if (coords == undefined) {
        isDrawn = true;
        return;
    }

    Object.keys(coords).forEach(coord => {
        const d = coords[coord]
        const latlng = new google.maps.LatLng(d.latitude, d.longitude);
        //var center = camera_bounds.getCenter();  // (55.04334815163844, -1.9917653831249726)
        //console.log(coord)
        const camera_bounds = map.getBounds();
        if (camera_bounds.contains(latlng)) {
            data.push(d)
        }
    })

    data.sort((a, b) => a.count - b.count)

    // Add the container when the overlay is added to the map.
    overlay.onAdd = function () {
        layer = d3.select(this.getPanes().overlayMouseTarget)
            .append("div")
            .attr("class", "attacks")

        // Draw each marker as a separate SVG element.
        // We could use a single SVG, but what size would it have?
        overlay.draw = function () {
            var projection = this.getProjection();

            var marker = layer.selectAll("svg")
                .data(d3.entries(data))
                .each(transform) // update existing markers
                .enter().append("svg")
                .each(transform)
                .style("width", function (d) {
                    x = node_padding_d3(d)
                    return x * 2.7
                })
                .style("height", function (d) {
                    x = node_padding_d3(d)
                    return x * 2.7
                })

            //.attr("class", "marker")

            // Add a circle.
            var circle = marker.append("circle")
                .attr("r", node_padding_d3)
                .attr("cx", function (d) {
                    x = node_padding_d3(d)
                    return x + 3
                })
                .attr("cy", function (d) {
                    x = node_padding_d3(d)
                    return x + 3
                })
                .style("fill", node_color_d3)
                .on("mouseover", handleMouseOver)
                .on("mouseout", handleMouseOut)
                .on("click", handle_node_click_open_table)
                .style("cursor", "pointer")

            // Add a label.
                marker.append("text")
                .attr('text-anchor', 'middle')
                .attr("dominant-baseline", "central") 
                .attr("x", function (d) {
                    x = node_padding_d3(d)
                    return x + 2
                })
                .attr("y", function (d) {
                    x = node_padding_d3(d)
                    return x -1
                })
                .attr("dy", ".33em")
                .attr("pointer-events", "none")
                .attr("fill", "white")
                .text(function (d) { return d.value.count; })

            function transform(d) {
                let lat = parseFloat(d.value.coord_lat)
                let lang = parseFloat(d.value.coord_lng)
                const latlng = new google.maps.LatLng(lat, lang);
                const pnt = projection.fromLatLngToDivPixel(latlng);
                return d3.select(this)
                    .style("left", (pnt.x - node_padding_d3(d)) + "px")
                    .style("top", (pnt.y - node_padding_d3(d)) + "px");
            }
        };

    };
    overlay.onRemove = function () {
        layer.selectAll("svg").remove();    
    }
    overlay.setMap(map);     // Bind our overlay to the map…
    //disableMap(false);
    isDrawn = true;
}





function handleMouseOver () {
    d3.select(this)
        .attr("r", d => {
            x = node_padding_d3(d);
            return (x * 1.1)
        })
        .style("fill", "orange");
}

var handleMouseOut = function () {
    d3.select(this)
        .style("fill", node_color_d3)
        .attr("r", node_padding_d3)
}



function node_color_d3(d) {
    const color = d3.rgb(255, 40,40);
    const x = Math.floor((d.value.count) * 0.005);
    return d3.hsl(color).darker(x);
}
function node_padding_d3(d) {
    let val = d.value.count
    val = Math.log2(val) *1.5;
    if (val > 25) val = 25;
    if (val < 8) val = 8;
    return val;
}

function handle_node_click_open_table() {
    points_from_click = d3.select(this).data()[0];
    points_array = points_from_click.value.points;

    data_table.clear();
    data_table.rows.add(points_array).draw();

    $('#table_wrapper').show();

    $('#table_wrapper').css("pointer-events","auto")
    console.log(points_array)


}

function closeTable() {
    $('#table_wrapper').css("pointer-events","none")
    $('#table_wrapper').hide();
}


function createChart() {
    let years = {}
    terror.forEach(t => {
        if(years.hasOwnProperty(t.iyear) === false) {
            years[t.iyear] = {count:0}
        }
        years[t.iyear].count +=1;
    });
    let col1 = Object.keys(years).map(y => {
        return y
    });
    let col2 = Object.keys(years).map(y => {
        return years[y].count
    });

// {year:y, ...years[y] }

    //console.log(x);

    //const d1 = ['data1']
    //const d2 = Object.keys(years)
    //const d4 = d1.concat(d2)

    //console.log(d4)

    var chart = c3.generate({
        bindto: '#chart_year_attacks',
        data: {
            x: 'data1',
          columns: [
            ['data1', ...col1],
            ['data2', ...col2]
          ]
        }
    });







    countries = {}

    terror.forEach(t => {
        if(countries.hasOwnProperty(t.country_txt) == false) {
            countries[t.country_txt] = {country : t.country_txt,count:0}
        }
        countries[t.country_txt].count +=1;
    });

    tempData = []
    tempData = Object.keys(countries).map(c => {
        //thing = countries[c];
        return countries[c];
    })
    
    tempData.sort((a, b) => b.count - a.count)
    tempData = tempData.slice(0,25);

    console.log(tempData)
    col1 = tempData.map(y => {
        return y.country
    });
    col2 = tempData.map(y => {
        return y.count
    });




    console.log(col1)
    console.log(col2)

    var chart = c3.generate({
        bindto: '#chart_country_attacks',
        data: {
            x : 'x',
            labels: true,
          columns: [
            ['x', ...col1],
            ['data2', ...col2]
          ],
          
        type: 'bar'
    },
    axis: {
        x: {
            type: 'category',
            tick: {
                rotate: 50,
                multiline: false
            },
        }
    },

    });



    months = {}

    terror.forEach(t => {
        if(months.hasOwnProperty(t.imonth) === false) {
            months[t.imonth] = {count:0}
        }
        months[t.imonth].count +=1;
    });
    col1 = Object.keys(months).map(y => {
        return y
    });
    col2 = Object.keys(months).map(y => {
        return months[y].count
    });

    var chart = c3.generate({
        bindto: '#chart_month_attacks',
        data: {
            x: 'data1',
          columns: [
            ['data1', ...col1],
            ['data2', ...col2]
          ]
        }
    });





}

function createBar1SVG() {

    var data = [4, 8, 15, 16, 23, 42];

    var width = 420,
        barHeight = 20;

    var scaleBar = d3.scaleLinear()
        .domain([0, d3.max(data)])
        .range([0, width]);

    var chart = d3.select(".chart")
        .attr("width", width)
        .attr("height", barHeight * data.length);

    var bar = chart.selectAll("g")
        .data(data)
        .enter().append("g")
        .attr("transform", function (d, i) { return "translate(0," + i * barHeight + ")"; });

    bar.append("rect")
        .attr("width", scaleBar)
        .attr("height", barHeight - 1);

    bar.append("text")
        .attr("x", function (d) { return scaleBar(d) - 3; })
        .attr("y", barHeight / 2)
        .attr("dy", ".35em")
        .text(function (d) { return d; });
}