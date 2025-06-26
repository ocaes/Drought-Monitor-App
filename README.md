# Drought-Monitor-App


**Key Academic References:**

1. **TVDI Concept**  
   Sandholt, I., Rasmussen, K., & Andersen, J. (2002). A simple interpretation of the surface temperature/vegetation index space for assessment of surface moisture status. *Remote Sensing of Environment*, 79(2-3), 213-224.

2. **MODIS LST Processing**  
   Wan, Z. (2014). New refinements and validation of the collection-6 MODIS land-surface temperature/emissivity product. *Remote Sensing of Environment*, 140, 36-45.

3. **Drought Classification**  
   Zhang, F., Zhang, L., Wang, X., & Hung, J. (2016). Detecting agro-droughts in Southwest of China using MODIS satellite data. *Remote Sensing*, 8(5), 381.

4. **Earth Engine Methodology**  
   Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S., Thau, D., & Moore, R. (2017). Google Earth Engine: Planetary-scale geospatial analysis for everyone. *Remote Sensing of Environment*, 202, 18-27.

5. **TVDI Implementation**  
   Petropoulos, G., Carlson, T., Wooster, M., & Islam, S. (2009). A review of Ts/VI remote sensing based methods for the retrieval of land surface energy fluxes and soil surface moisture. *Progress in Physical Geography*, 33(2), 224-250.

**Implementation Notes:**
- The TVDI dry/wet edge determination follows the empirical approach established by Sandholt et al.
- MODIS quality flags are rigorously applied to ensure data reliability
- The 3-day temporal window for NDVI/LST pairing accounts for cloud contamination gaps
- Classification thresholds follow established drought monitoring conventions
- The interactive dashboard enables spatial-temporal analysis of drought conditions

This implementation provides an operational drought monitoring system using peer-reviewed methods while addressing practical considerations like data quality handling and user interface design.
