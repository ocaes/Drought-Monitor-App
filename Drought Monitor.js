// Lesotho Drought Monitoring App Using TVDI (Fixed UI Styling)

// 1. Region of Interest
var lesotho = ee.FeatureCollection("FAO/GAUL/2015/level0")
  .filter(ee.Filter.eq("ADM0_NAME", "Lesotho"));
Map.centerObject(lesotho, 8);

var districts = ee.FeatureCollection("FAO/GAUL/2015/level1")
  .filter(ee.Filter.eq("ADM0_NAME", "Lesotho"));
var districtNames = districts.aggregate_array("ADM1_NAME").sort().getInfo();
districtNames.unshift('All Districts');  // Add option for all districts

// 2. Date Range
var startDate = "2023-01-01";
var endDate = "2023-12-31";

// 3. Load and preprocess MODIS data
function preprocessLST(img) {
  var qc = img.select('QC_Day');
  var dataQuality = qc.bitwiseAnd(3);
  var mask = dataQuality.lte(1);
  var lst = img.select('LST_Day_1km')
    .multiply(0.02).subtract(273.15)
    .updateMask(mask)
    .rename('LST_Celsius');
  return img.addBands(lst);
}

function preprocessNDVI(img) {
  var summaryQA = img.select('SummaryQA');
  var mask = summaryQA.lte(1);
  var ndvi = img.select('NDVI')
    .divide(10000)
    .updateMask(mask)
    .rename('NDVI_calculated');
  return img.addBands(ndvi);
}

var modisLST = ee.ImageCollection("MODIS/061/MOD11A1")
  .filterDate(startDate, endDate)
  .map(preprocessLST);

var modisNDVI = ee.ImageCollection("MODIS/061/MOD13A1")
  .filterDate(startDate, endDate)
  .map(preprocessNDVI);

// 4. Join LST and NDVI collections
var filterTime = ee.Filter.maxDifference({
  difference: 3 * 24 * 60 * 60 * 1000,
  leftField: 'system:time_start',
  rightField: 'system:time_start'
});

var joined = ee.Join.saveBest({
  matchKey: 'bestNDVI',
  measureKey: 'timeDiff'
}).apply({
  primary: modisLST,
  secondary: modisNDVI,
  condition: filterTime
});

var joinedCollection = ee.ImageCollection(joined.map(function(feature) {
  var lstImg = ee.Image(feature);
  var ndviImg = ee.Image(feature.get('bestNDVI'));
  return lstImg.addBands(ndviImg.select('NDVI_calculated'));
}));

// 5. Regression for TVDI
var medianComposite = joinedCollection.select(['NDVI_calculated', 'LST_Celsius'])
  .reduce(ee.Reducer.median());

var regressionSample = medianComposite.sample({
  region: lesotho.geometry(),
  scale: 1000,
  numPixels: 10000,
  seed: 42
}).filter(ee.Filter.and(
  ee.Filter.notNull(['NDVI_calculated_median']),
  ee.Filter.notNull(['LST_Celsius_median'])
));

// Wet edge
var wetEdge = regressionSample.reduceColumns({
  reducer: ee.Reducer.percentile([5]),
  selectors: ['LST_Celsius_median']
}).get('p5');

// Dry edge model
var dryEdgeModel = regressionSample.reduceColumns({
  reducer: ee.Reducer.linearRegression({numX: 1, numY: 1}),
  selectors: ['NDVI_calculated_median', 'LST_Celsius_median']
});

var coeffs = ee.Array(dryEdgeModel.get('coefficients'));
var dimensions = coeffs.length().getInfo();
var dryEdgeSlope = 0;
var dryEdgeIntercept = 0;

if (dimensions[0] >= 2 && dimensions[1] >= 1) {
  dryEdgeSlope = coeffs.get([1, 0]);
  dryEdgeIntercept = coeffs.get([0, 0]);
} else {
  dryEdgeSlope = -10;
  dryEdgeIntercept = 45;
  print('Warning: Using fallback dry edge parameters');
}

// 6. TVDI computation
var tvdiCollection = joinedCollection.map(function(img) {
  var lst = img.select('LST_Celsius');
  var ndvi = img.select('NDVI_calculated');
  var dryEdge = ndvi.multiply(dryEdgeSlope).add(dryEdgeIntercept);
  var wetEdgeImg = ee.Image.constant(wetEdge);
  var tvdi = lst.subtract(wetEdgeImg)
    .divide(dryEdge.subtract(wetEdgeImg))
    .clamp(0, 1)
    .rename('TVDI');
  return img.addBands(tvdi).copyProperties(img, ['system:time_start']);
});

// 7. Drought Classification
var meanTVDI = tvdiCollection.select('TVDI').mean().rename('mean_TVDI');

var droughtClass = meanTVDI.expression(
  "b('mean_TVDI') <= 0.2 ? 1 : " +
  "b('mean_TVDI') <= 0.4 ? 2 : " +
  "b('mean_TVDI') <= 0.6 ? 3 : " +
  "b('mean_TVDI') <= 0.8 ? 4 : 5"
).rename('Drought_Class').clip(lesotho);

// Visualization
var classPalette = ['0047AB', '6EC4E8', '76BA1B', 'FFC000', 'E50000'];
var classLabels = [
  'Very Wet (0-0.2)', 
  'Wet (0.2-0.4)', 
  'Normal (0.4-0.6)', 
  'Dry (0.6-0.8)', 
  'Very Dry (0.8-1)'
];
var visParams = {min: 1, max: 5, palette: classPalette};

// === UI Panel ===
var panel = ui.Panel({style: {width: '420px', position: 'bottom-right'}});

panel.add(ui.Label('🌍 Lesotho Drought Monitor 2023', {
  fontWeight: 'bold',
  fontSize: '18px',
  padding: '8px 5px'
}));

// District selector
panel.add(ui.Label('SELECT DISTRICT:', {padding: '5px 5px 2px'}));
var districtDropdown = ui.Select({
  items: districtNames,
  placeholder: 'Select a district...'
});
panel.add(districtDropdown);

// Mean TVDI label
var meanLabel = ui.Label('Mean TVDI: N/A', {padding: '5px 5px'});
panel.add(meanLabel);

// Time series chart panel
panel.add(ui.Label('TVDI TIME SERIES:', {padding: '10px 5px 2px', fontWeight: 'bold'}));
var chartPanel = ui.Panel(null, ui.Panel.Layout.flow('vertical'));
chartPanel.style().set({width: '100%'});
panel.add(chartPanel);

// Legend
panel.add(ui.Label('DROUGHT CLASSIFICATION:', {padding: '10px 5px 2px'}));
classLabels.forEach(function(label, i) {
  var colorBox = ui.Label('', {});
  colorBox.style().set({
    backgroundColor: '#' + classPalette[i],
    padding: '8px',
    margin: '0 5px 0 0'
  });
  var row = ui.Panel([colorBox, ui.Label(label)], ui.Panel.Layout.flow('horizontal'));
  row.style().set({margin: '2px 0'});
  panel.add(row);
});
/*
// Export buttons panel
var exportPanel = ui.Panel(null, ui.Panel.Layout.flow('horizontal'));
exportPanel.style().set({margin: '10px 0', padding: '5px'});
panel.add(exportPanel);

var exportImageBtn = ui.Button({
  label: 'Export Image',
  onClick: function () {
    Export.image.toDrive({
      image: droughtClass,
      description: 'Lesotho_Drought_Classes_2023',
      folder: 'EarthEngine',
      region: lesotho.geometry(),
      scale: 1000,
      maxPixels: 1e13,
      crs: 'EPSG:4326',
      fileFormat: 'GeoTIFF'
    });
  }
});

var exportStatsBtn = ui.Button({
  label: 'Export Stats',
  onClick: function () {
    Export.table.toDrive({
      collection: generateDistrictStats(),
      description: 'Lesotho_Drought_Stats_2023',
      folder: 'EarthEngine',
      fileFormat: 'CSV'
    });
  }
});

exportPanel.add(exportImageBtn);
exportPanel.add(exportStatsBtn);
*/
// Date slider for monthly TVDI display
panel.add(ui.Label('SELECT MONTH:', {padding: '10px 5px 2px', fontWeight: 'bold'}));
var slider = ui.Slider({
  min: 1, max: 12, step: 1,
  style: {stretch: 'horizontal'}
});
slider.setValue(1);
panel.add(slider);

// Monthly TVDI images for slider
var monthlyTVDI = ee.ImageCollection.fromImages(
  ee.List.sequence(1, 12).map(function(month) {
    var m = ee.Number(month);
    var start = ee.Date(startDate).advance(m.subtract(1), 'month');
    var end = start.advance(1, 'month');
    return tvdiCollection.filterDate(start, end)
      .mean()
      .select('TVDI')
      .clip(lesotho)
      .set('month', m)
      .set('system:time_start', start.millis());
  })
);

// Map layer management for monthly TVDI display on slider change
slider.onChange(function(month) {
  var selectedMonth = parseInt(month, 10);
  var monthlyImage = monthlyTVDI.filter(ee.Filter.eq('month', selectedMonth)).first();
  Map.layers().set(0, ui.Map.Layer(monthlyImage, {min: 0, max: 1, palette: classPalette}, 'TVDI - Month ' + selectedMonth));
});

// District dropdown change handler
districtDropdown.onChange(function(name) {
  Map.layers().reset();

  var region = (name === 'All Districts') ? lesotho : districts.filter(ee.Filter.eq('ADM1_NAME', name));
  Map.centerObject(region, name === 'All Districts' ? 8 : 9);

  // Add drought class layer clipped to selected district
  Map.addLayer(droughtClass.clip(region), visParams, 'Drought Class');
  Map.addLayer(region.style({color: '#222', fillColor: '00000000', width: 1.5}), {}, 'District Boundary');

  // Update time series chart panel
  chartPanel.clear();
  chartPanel.add(createTVDIChart(region));

  // Update mean TVDI label
  var mean = tvdiCollection.select('TVDI').mean().reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: region.geometry(),
    scale: 1000,
    maxPixels: 1e13
  }).get('TVDI');

  mean.evaluate(function(val) {
    meanLabel.setValue('Mean TVDI: ' + (val ? val.toFixed(3) : 'N/A'));
  });
});

// Initial layers & UI setup
Map.addLayer(droughtClass, visParams, 'Drought Class');
Map.addLayer(lesotho.style({color: '#222', fillColor: '00000000', width: 1}), {}, 'National Border');

chartPanel.add(createTVDIChart(lesotho));
var initialMean = tvdiCollection.select('TVDI').mean().reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: lesotho.geometry(),
  scale: 1000,
  maxPixels: 1e13
}).get('TVDI');
initialMean.evaluate(function(val) {
  meanLabel.setValue('Mean TVDI: ' + (val ? val.toFixed(3) : 'N/A'));
});

Map.add(panel);

// === Functions ===

// Time series chart creator
function createTVDIChart(region) {
  return ui.Chart.image.series({
    imageCollection: tvdiCollection.select('TVDI'),
    region: region.geometry(),
    reducer: ee.Reducer.mean(),
    scale: 1000,
    xProperty: 'system:time_start'
  }).setOptions({
    title: 'TVDI Time Series:2023 ',
    vAxis: {title: 'TVDI Value', minValue: 0, maxValue: 1},
    hAxis: {title: 'Date', format: 'MMM yyyy'},
    lineWidth: 2,
    colors: ['E50000'],
    curveType: 'function'
  });
}

// Generate district statistics for export
function generateDistrictStats() {
  return districts.map(function(district) {
    var meanTVDI = droughtClass.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: district.geometry(),
      scale: 1000,
      maxPixels: 1e9
    }).get('Drought_Class');

    var area = district.geometry().area().divide(1e6);

    return ee.Feature(null, {
      District: district.get('ADM1_NAME'),
      Mean_TVDI: meanTVDI,
      Area_km2: area,
      Drought_Class: ee.Number(meanTVDI).round()
    });
  });
}
