# Drought-Monitor-App

### App Description  
The **Lesotho Drought Monitoring App** is an interactive Earth Engine application that assesses drought conditions across Lesotho for 2023 using satellite-derived **Temperature Vegetation Dryness Index (TVDI)**. It features:  
1. **Spatial Analysis**: Drought severity maps classified into five levels (Very Wet to Very Dry).  
2. **Interactive Dashboard**:  
   - District-level selection (including "All Districts").  
   - Monthly TVDI visualization via slider.  
   - Time-series chart of TVDI dynamics.   
3. **Metrics**: Mean TVDI values and drought classification at national/district scales.  

---

### Methodological Approach  
1. **Data Acquisition**:  
   - **MODIS LST** (MOD11A1.061) and **NDVI** (MOD13A1.061) for 2023.  
   - Administrative boundaries from FAO GAUL (2015).  

2. **Preprocessing**:  
   - **LST**: Scaled to °C, masked using QC flags to retain high-quality pixels.  
   - **NDVI**: Scaled (-1 to 1), masked via `SummaryQA` for reliable vegetation data.  

3. **TVDI Calculation**:  
   - **Data Integration**: Joined LST and NDVI collections within 3-day windows.  
   - **Edge Detection**:  
     - *Wet Edge*: 5th percentile of LST (coolest/wettest pixels).  
     - *Dry Edge*: Linear regression of LST vs. NDVI (driest conditions).  
   - **Formula**:  
     \[
     \text{TVDI} = \frac{\text{LST} - \text{LST}_{\text{wet}}}{\text{LST}_{\text{dry}} - \text{LST}_{\text{wet}}}
     \]  
     where \(\text{LST}_{\text{dry}} = \text{slope} \times \text{NDVI} + \text{intercept}\).  

4. **Drought Classification**:  
   - Annual mean TVDI categorized into 5 classes:  
     - `1`: Very Wet (TVDI ≤ 0.2)  
     - `5`: Very Dry (TVDI > 0.8)  

5. **Validation**:  
   - Fallback regression parameters used if insufficient data.  
   - TVDI constrained to [0, 1] to avoid outliers.  

---

### Key References  
1. **TVDI Framework**:  
   Sandholt et al. (2002). [*Remote Sensing of Environment*](https://doi.org/10.1016/S0034-4257(01)00302-8).  
2. **MODIS Processing**:  
   Wan (2014) [LST](https://doi.org/10.1016/j.rse.2013.07.013); Didan (2015) [NDVI](https://lpdaac.usgs.gov/documents/101/MOD13_User_Guide_V6.pdf).  
3. **Drought Classes**:  
   Zhang et al. (2016) [*Remote Sensing*](https://doi.org/10.3390/rs8050381).  
4. **GEE Implementation**:  
   Gorelick et al. (2017) [*Remote Sensing of Environment*](https://doi.org/10.1016/j.rse.2017.06.031).  

This operational tool supports drought resilience planning in Lesotho using peer-reviewed remote sensing methods.
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
