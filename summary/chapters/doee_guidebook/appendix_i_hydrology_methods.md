# Appendix I Hydrology Methods

**Source:** `docs/DOEE Stormwater Management Guidebook January 2020.pdf`  
**Pages:** 477–512 (PDF page numbers)  
**Parent document:** DOEE Stormwater Management Guidebook (January 2020)

---

Appendix I Acceptable Hydrologic Methods and
Models
I.1 Acceptable Hydrologic Methods and Models
The following are the acceptable methodologies and computer models for estimating runoff
hydrographs before and after development. These methods are used to predict the runoff
response from given rainfall information and site surface characteristic conditions. The design
storm frequencies used in all of the hydrologic engineering calculations will be based on design
storms required in this guidebook unless circumstances make consideration of another storm
intensity criterion appropriate:
 Urban Hydrology for Small Watersheds TR-55 (TR-55)
 Storage-Indication Routing
 HEC-1, WinTR-55, TR-20, and SWMM Computer Models
 Rational Method (limited to sites under 5 acres)
These methods are given as valid in principle and are applicable to most stormwater management
design situations in the District. Other methods may be used when the District reviewing
authority approves their application.
Note: Of the above methods, TR-55 and SWMM allow for the easiest correlation of the benefits
of retention best management practices (BMPs) used to meet the SWRv with peak flow detention
requirements, and are therefore strongly recommended. The Rational Method is not
recommended, as it cannot account for the detention benefits of smaller retention BMPs applied
on a site. However, the Rational Method is useful for quickly and easily calculating peak flows
and detention requirements. Appendix A - Compliance Calculations and Design Examples
includes more information on using the General Retention Compliance Calculator and
Stormwater Database to account for retention BMPs in calculating peak flow detention
requirements.
The following conditions should be assumed when developing predevelopment, pre-project, and
post-development hydrology, as applicable:
 Predevelopment runoff conditions (used for the 2-year storm) shall be computed independent
of existing developed land uses and conditions and shall be based on “meadow in good
condition” or better, assuming good hydrologic conditions and land with grass cover.
 Pre-project runoff conditions (used for the 15-year storm) shall be based on the existing
condition of the site.
 Post-development conditions shall be computed for future land use assuming good
hydrologic and appropriate land use conditions. If an NRCS CN Method-based approach,
I-1

Appendix I Acceptable Hydrologic Methods and Models
such as TR-55, is used, this curve number (CN) may be reduced based upon the application
of retention BMPs, as indicated in the General Retention Compliance Calculator and
Stormwater Database (see Appendix A - Compliance Calculations and Design Examples).
This CN reduction will reduce the required detention volume for a site, but it should not be
used to reduce the size of conveyance infrastructure.
 The rainfall intensity - duration - frequency curve should be determined from the most recent
version of the Hydrometeorological Design Studies Center’s Precipitation Frequency Data
Server (NOAA Atlas 14, Volume 2).
 Predevelopment time of concentration shall be based on the sum total of computed or
estimated overland flow time and travel in natural swales, streams, creeks and rivers, but
never less than 6 minutes.
 Post-development time of concentration shall be based on the sum total of the inlet time and
travel time in improved channels or storm drains, but shall not be less than 6 minutes.
 Site drainage areas exceeding 25 acres that are heterogeneous with respect to land use, soils,
CN or time of concentration shall require a separate hydrologic analysis for each sub-area.
 Hydrologic soil groups (HSGs) approved for use in the District are contained in the Soil
Survey of the District of Columbia Handbook. Where the HSG is not available through the
Soil Survey due to the listed soil type being “Urban Soils” or similar, an HSG of C shall be
used.
I.2 Urban Hydrology for Small Watersheds TR-55
Chapter 6 of Urban Hydrology for Small Watersheds TR-55, Storage Volume for Detention
Basins, or TR-55 shortcut procedure, is based on average storage and routing effects for many
structures and can be used for multistage outflow devices. Refer to TR-55 for more detailed
discussions and limitations.
Information Needed
To calculate the required storage volume using TR-55, the predevelopment hydrology for the 2-
year storm and the pre-project hydrology for the 15-year storm are needed, along with post-
development hydrology for both the 2-year and 15-year storms. The predevelopment hydrology
for the 2-year storm is based on natural conditions (meadow) and will determine the site’s
predevelopment peak rate of discharge, or allowable release rate, qo2, for the 2-year storm,
whereas the pre-project hydrology for the 15-year storm is based on existing conditions and will
determine the site’s pre-project peak rate of discharge, or allowable release rate, qo15, for the 15-
year storm.
The post-development hydrology may be determined using the reduced CNs calculated in the
General Retention Compliance Calculator and Stormwater Database (See Appendix A -
Compliance Calculations and Design Examples) or more detailed routing calculations. This will
determine the site’s post-development peak rate of discharge, or inflow for both the 2-year and
15-year storms, qi2 and qi15, respectively, and the site’s post-developed runoff, Q2 and Q15, in
inches. Note that this method does not require a hydrograph. Once the above parameters are
I-2

Appendix I Acceptable Hydrologic Methods and Models
known, the TR-55 Manual can be used to approximate the storage volume required for each
design storm. The following procedure summarizes the TR-55 shortcut method for detention
calculations in the District.
Procedure
1. Determine if detention is required. Detention rules apply to the site as a whole rather than the
individual SDAs so to determine if detention is required, compare the curve numbers for the
total site. If the post-development reduced curve number is greater than the predevelopment
curve number, detention is required for the 2-year storm. If the post-development reduced
curve number is greater than the pre-project curve number, detention is required for the 15-
year storm.
2. Determine the peak development inflows qi2 and qi15, the runoff volumes Q2 and Q15, and
the allowable release rates qo2 and qo15, from the hydrology for the appropriate design storm.
3. Using the ratio of the allowable release rate, qo, to the peak developed inflow, qi , or qo/qi,
for both the 2-year and 15-year design storms, use Figure I.1 (or Figure 6.1 in TR-55) to
obtain the ratio of storage volume, Vs, to runoff volume, Vr, or Vs2 /Vr2 and Vs15 /Vr15 for
Type II storms.
I-3

Appendix I Acceptable Hydrologic Methods and Models
Figure I.1 Approximate detention basin routing for rainfall types I, IA, II and III.
4. Determine the runoff volumes, Vr2 and Vr15.
𝑉𝑟2 = 𝑄2
12 × 𝑆𝐷𝐴
where:
Vr2 = post-development runoff for the 2-year storm (ft3)
Q2 = post-development runoff for the 2-year storm (in.)
12 = conversion factor from inches to feet
SDA = Site Drainage Area (ft2)
𝑉𝑟15 = 𝑄15
12 × 𝑆𝐷𝐴
where:
Vr15 = post-development runoff for the 15-year storm (ft3)
I-4

Appendix I Acceptable Hydrologic Methods and Models
Q15 = post-development runoff for the 15-year storm (in.)
12 = conversion factor from inches to feet
SDA = Site Drainage Area (ft2)
5. Multiply the Vs/Vr ratios from Step 1 by the runoff volumes, Vr2 and Vr15, from Step 2, to
determine the required storage volumes, Vs2 and Vs15, in acre-feet.
�𝑉𝑠2
𝑉𝑟2
�𝑉𝑟2 = 𝑉𝑠2
�𝑉𝑠15
𝑉𝑟15
�𝑉𝑟15 = 𝑉𝑠15
Note: In most cases, Vs15 represents the total storage required for the 2-year storm and the
15-year storm, and the outflow, qo15, includes the outflow qo2. In some cases, Vs15 may be
less than Vs2. In these cases, the storage volume provided for the 2-year storm (Vs2) may or
may not be sufficient to meet the 15-year requirements and must be checked via stage-
storage curve analysis.
6. Design a storage practice that holds the required volume with one or more orifices or other
outlet devices that limit the outflow to the allowable discharge rates for the 2-year and 15-
year storms. See the orifice equation in Appendix H - Design of Flow Control Structures.
Limitations
This routing method is less accurate as the qo/qi ratio approaches the limits shown in Figure I.1.
The curves in Figure I.1 depend on the relationship between available storage, outflow device,
inflow volume, and shape of the inflow hydrograph. When storage volume (Vs) required is small,
the shape of the outflow hydrograph is sensitive to the rate of the inflow hydrograph.
Conversely, when Vs is large, the inflow hydrograph shape has little effect on the outflow
hydrograph. In such instances, the outflow hydrograph is controlled by the hydraulics of the
outflow device and the procedure therefore yields consistent results. When the peak outflow
discharge (qo) approaches the peak inflow discharge (qi) parameters that affect the rate of rise of
a hydrograph, such as rainfall volume, CN, and time of concentration, become especially
significant.
The procedure should not be used to perform final design if an error in storage of 25% cannot be
tolerated. Figure I.1 is biased to prevent undersizing of outflow devices, but it may significantly
overestimate the required storage capacity. More detailed hydrograph development and storage
indication routing will often pay for itself through reduced construction costs.
I-5

Appendix I Acceptable Hydrologic Methods and Models
Example 1a
A 48,000 square foot development is proposed on Type C soils. SDA 1 will include a parking lot
and a bioretention area (Figure I.2). SDA 2 will include a building and a green roof (Figure I.3).
Predevelopment conditions on both SDAs yield a curve number of 70. In SDA 1, pre-project
conditions include only turf cover, yielding a curve number of 74. Pre-project conditions in SDA
2 include both impervious and turf areas, yielding a curve number of 86. These values are
indicated in Table I.1. Based on the proposed land covers and the implementation of the
bioretention and green roof (which serve to reduce curve numbers), the post-development curve
numbers are also indicated in Table I.1.
Figure I.2 SDA 1 for Example 1a.
Figure I.3 SDA 2 for Example 1a.
Table I.1 Curve Numbers for Example 1a.
Area
Predevelopment
Curve Number
2-Year Post-
Development
Curve Number1
Pre-Project
Curve
Number
15-Year Post-
Development
Curve Number1
SDA 1 23,000 ft2 70 82 74 85
SDA 2 25,000 ft2 70 71 86 78
Total Site 48,000 ft2 70 76 80 81
1. These values incorporate the reductions achieved due to the implementation of the
bioretention area and the green roof.
Step 1: Determine if detention is required.
For the total site, the 2-year post-development curve number of 76 is greater than the
predevelopment curve number of 70, and the 15-year post-development curve number of 81 is
greater than the pre-project curve number of 80. Therefore, detention will be needed for both the
2-year and 15-year storm.
Step 2: Determine the peak development inflows qi2 and qi15 and the allowable release
rates qo2 and qo15 from the hydrology for the appropriate design storm.
Building with Green Roof
SDA 2 = 25,000 ft2
Post-Development CN (2-year/15-year) = 71/78
Parking Lot
Bioretention
SDA 1 = 23,000 ft2
Post-Development CN (2-year/15-year)= 82/85
I-6

Appendix I Acceptable Hydrologic Methods and Models
There are several programs available for calculating peak flows and runoff hydrographs. The
WinTR-55 program will be used in this example. The WinTR-55 program and support materials,
including the User Guide can be found here:
https://www.nrcs.usda.gov/wps/portal/nrcs/detailfull/national/water/?cid=stelprdb1042901
Eight different model scenarios will be needed for this example, with the following
inputs/characteristics (see Tables I.2 and I.3).
Table I.2 SDA 1 TR-55 Model Scenarios for Example 1a.
Input
2- Year
Predevelopment
2-Year Post-
Development
15-Year
Pre-Project
15-Year Post-
Development
Area 0.53 acre
Curve Number 70 82 74 85
Time of
Concentration1 0.1 hour
Rainfall Depth2 3.14 inches 3.14 inches 5.23 inches 5.23 inches
Table I.3 SDA 2 TR-55 Model Scenarios for Example 1a.
Input
2- Year
Predevelopment
2-Year Post-
Development
15-Year
Pre-Project
15-Year Post-
Development
Area 0.57 acre
Curve Number 70 71 86 78
Time of
Concentration1 0.1 hour
Rainfall Depth2 3.14 inches 3.14 inches 5.23 inches 5.23 inches
1. Actual drainage characteristics (flow lengths, slopes, etc.) shall be used, but the minimum Tc
must be 6 minutes (0.1 hour).
2. The NRCS Type II Storm Event shall be used.
Using these inputs, WinTR-55 can produce peak flow rates and runoff volumes for the various
scenarios (Tables I.4 and I.5).
Table I.4 Example 1a Peak Flow Rates for SDA 1 and SDA 2.
SDA
2- Year
Predevelopment
Peak Flow (qo2)
2-Year Post-
Development
Peak Flow (qi2)
15-Year Pre-
Project Peak
Flow (qo15)
15-Year Post-
Development
Peak Flow (qi15)
SDA 1 0.59 cfs 1.22 cfs 2.09 cfs 2.88 cfs
SDA 2 0.64 cfs 0.69 cfs 3.17 cfs 2.55 cfs
Table I.5 Example 1a Runoff Volumes for SDA 1 and SDA 2.
SDA
2-Year Post-Development
Runoff Volume (Q2)
15-Year Post-Development
Runoff Volume (Q15)
SDA 1 0.98 inch 3.00 inches
SDA 2 0.46 inch 2.41 inches
I-7

Appendix I Acceptable Hydrologic Methods and Models
Step 3: Using the ratio of the allowable release rate qo to the peak developed inflow qi,
or qo/qi, for both the 2-year and 15-year design storms, use Figure I.1 (or Figure 6.1 in
TR-55) to obtain the ratio of storage volume Vs to runoff volume Vr, or Vs2 /Vr2 and Vs15
/Vr15 for Type II storms.
For SDA 1 (yellow lines on Figure I.4):
qo2/qi2 = 0.59/1.22 = 0.48
qo15/qi15 = 2.09/2.88 = 0.73
For SDA 2 (red line on Figure I.4):
qo2/qi2 = 0.64/0.69 = 0.93
qo15/qi15 = 3.17/2.55 = 1.24 (If qo/qi is greater than 1, detention is not required)
Figure I.4 Approximate detention basin routing for Example 1a.
qo2/qi2
SDA 1
qo15/qi15
SDA 1
qo2/qi2
SDA 2
I-8

Appendix I Acceptable Hydrologic Methods and Models
For SDA 1:
Vs2/Vr2 = 0.29
Vs15/Vr15 = 0.20
For SDA 2:
Vs2/Vr2 = 0.16
Step 4: Determine the runoff volumes Vr2 and Vr15.
SDA 1:
𝑉𝑟2 = 𝑄2
12 × 𝑆𝐷𝐴
𝑉𝑟2 = 0.98 𝑖𝑛.
12 × 0.53 𝑎𝑐𝑟𝑒× 43,560 = 1,885 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡
𝑉𝑟15 = 𝑄15
12 × 𝑆𝐷𝐴
𝑉𝑟15 = 3.00 𝑖𝑛.
12 × 0.53 𝑎𝑐𝑟𝑒× 43,560 = 5,772 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡
SDA 2:
𝑉𝑟2 = 𝑄2
12 × 𝑆𝐷𝐴
𝑉𝑟2 = 0.46 𝑖𝑛
12 × 0.57 × 43,560 = 952 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡
Step 5: Multiply the Vs/Vr ratios from Step 1 by the runoff volumes Vr2 and Vr15 from
Step 2 to determine the required storage volumes, Vs2 and Vs15, in acre-feet.
SDA 1:
�𝑉𝑠2
𝑉𝑟2
�𝑉𝑟2 = 𝑉𝑠2
(0.29) × 1,885 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡= 547 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡
I-9

Appendix I Acceptable Hydrologic Methods and Models
�𝑉𝑠15
𝑉𝑟15
�𝑉𝑟15 = 𝑉𝑠15
(0.20) × 5,772 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡= 1,154 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡
SDA 2:
�𝑉𝑠2
𝑉𝑟2
�𝑉𝑟2 = 𝑉𝑠2
(0.16) × 952 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡= 152 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡
Step 6: Design a storage practice that holds the required volume with one or more
orifices or other outlet devices that limit the outflow to the allowable discharge rates for the
2-year and 15-year storms.
In this example, a 4-foot high, 8-foot wide arch pipe-type tank will be used for both SDAs. The
tank has a cross sectional area of 25.12 cubic feet (Figure I.5).
Figure I.5 Cross sectional view of arch pipe tank.
For SDA 1, to meet the 15-year storage volume requirement of 1,154 cubic feet, the tank length
will need to be at least 46 feet long. Analysis of the cross-section indicates that the 2-year storm
storage volume of 547 cubic feet will rise to an elevation of 1.51 feet in this tank.
Next, the orifices must be designed. With a known depth in the tank, the outflow from the orifice
is calculated based on this equation from Appendix H.1 - Circular Orifices.
𝑄 = 𝐶𝐴(2𝑔ℎ)
0.5
I-10

Appendix I Acceptable Hydrologic Methods and Models
where:
Q = orifice discharge (cfs)
C = discharge coefficient = 0.6
A = orifice cross-sectional area (ft2) =
D = diameter of orifice (ft)
g = gravitational acceleration (32.2 ft/s2)
h = hydraulic head above the center of the orifice (ft)
For the two-year storm, the hydraulic head will be 1.51 feet and the target discharge will be 0.59
cfs:
0.59 𝑐𝑓𝑠 = 0.6 × 3.1416 × 𝐷
(2 × 32.2 𝑓𝑡
𝑠2 × 1.51 𝑓𝑡)0.5
Solving for D, the maximum orifice size is 0.36 feet; a 4-inch orifice (0.33 feet) will be used.
For the 15-year storm, the peak flow out the lowest orifice needs to be calculated first, with a
hydraulic head of 4 feet.
𝑄 = 0.6 × 3.1416 × (0.33 𝑓𝑡)
(2 × 32.2 𝑓𝑡
𝑠2 × 4 𝑓𝑡)0.5 = 0.82 𝑐𝑓𝑠
The second orifice will be located at elevation 1.51 feet, the peak elevation of the 2-year storm,
so it does not impact the 2-year detention. The head on the second orifice will then be 4 feet –
1.51 feet = 2.49 feet. The target discharge that will flow through the second orifice will be 2.09
cfs – 0.82 cfs = 1.27 cfs.
1.27 𝑐𝑓𝑠 = 0.6 × 3.1416 × 𝐷
(2 × 32.2 𝑓𝑡
𝑠
2 × 2.49 𝑓𝑡)0.5
Solving for D, the maximum orifice size is 0.46 feet, or 5.5 inches.
For SDA 1, the final detention tank design will be a 46-foot long, 4-foot by 8-foot arch culvert
with a 4-inch orifice at the bottom and a 5.5-inch orifice at elevation 1.51 feet. The 2-year peak
flow will be reduced to 0.59 cfs, and the 15-year peak flow will be reduced to 2.09 cfs.
For SDA 2, detention will only be needed for the 2-year storm. To meet the 15-year storage
volume requirement of 152 cubic feet, the 25.12 square-foot tank will only need to be 6.1 feet
long.
41416.3
2D×
I-11

Appendix I Acceptable Hydrologic Methods and Models
With a known depth in the tank, the outflow from the orifice is calculated based on this equation
from Appendix H.1 - Circular Orifices.
𝑄 = 𝐶𝐴(2𝑔ℎ)0.5
where:
Q = orifice discharge (cfs)
C = discharge coefficient = 0.6
A = orifice cross-sectional area (ft2) =
D = diameter of orifice (ft)
g = gravitational acceleration (32.2 ft/s2)
h = hydraulic head above the center of the orifice (ft)
Since this tank will have only one orifice, hydraulic head will be 4 feet, and the target discharge
will be 0.64 cfs:
0.64 𝑐𝑓𝑠 = 0.6 × 3.1416 × 𝐷
(2 × 32.2 𝑓𝑡
𝑠2 × 4 𝑓𝑡)0.5
Solving for D, the maximum orifice size is 0.29 feet, or 3.5 inches.
For SDA 2, the final detention tank design will be a 6.1-feet long, 4-foot by 8-foot arch culvert
with a 3.5-inch orifice at the bottom. The 2-year peak flow will be reduced to 0.64 cfs.
I.3 Storage-Indication Routing
Storage-Indication Routing may be used to analyze storage detention practices. This approach
requires that the inflow hydrograph be developed through one of the methods listed in this
appendix (TR-55, WinTR-55, SWMM, etc.), as well as the required maximum outflows, qo2 and
qo15. Using the stage-discharge relationship for a given combination outlet devices, the detention
volume necessary to achieve the maximum outflows can be determined.
Storage-Indication Routing provides a more accurate analysis of detention volume requirements
than the TR-55 shortcut procedure described in Section I.1.
Example 1b
Example 1b below uses the same site design as Example 1a in Section I.1 above. While the total
tank size is very similar in both analyses, Example 1b locates detention only in one site drainage
area (SDA 1), while accounting for the undetained flows in SDA 2.
A 48,000 square foot development is proposed on Type C soils. SDA 1 will include a parking lot
and a bioretention area (Figure I.6). SDA 2 will include a building and a green roof (Figure I.7).
41416.3
2D×
I-12

Appendix I Acceptable Hydrologic Methods and Models
Predevelopment conditions on both SDAs yield a curve number of 70. In SDA 1, preproject
conditions include only turf cover, yielding a curve number of 74. Pre-project conditions in SDA
2 include both impervious and turf areas, yielding a curve number of 86. These values are
indicated in Table I.6. Based on the proposed land covers and the implementation of the
bioretention and green roof (which serve to reduce curve numbers), the post-development curve
numbers are also indicated in Table I.6.
Figure I.6 SDA 1 for Example 1b.
Figure I.7 SDA 2 for Example 1b.
Table I.6 Curve Numbers for Example 1b.
Area
Predevelopment
Curve Number
2-Year Post-
Development
Curve
Number1
Pre-Project
Curve
Number
15-Year Post-
Development
Curve
Number1
SDA 1 23,000 ft2 70 82 74 85
SDA 2 25,000 ft2 70 71 86 78
Total Site 48,000 ft2 70 76 80 81
1. These values incorporate the reductions achieved due to the implementation of the
bioretention area and the green roof.
Step 1: Determine if detention is required.
For the total site, the 2-year post-development curve number of 76 is greater than the
predevelopment curve number of 70, and the 15-year post-development curve number of 81 is
greater than the pre-project curve number of 80. Therefore, detention will be needed for both the
2-year and 15-year storm.
Step 2: Calculate the predevelopment, pre-project, and post-development peak flows.
There are several programs available for developing runoff hydrographs. WinTR-55 will be used
in this example. The WinTR-55 program and support materials, including the User Guide can be
found here:
https://www.nrcs.usda.gov/wps/portal/nrcs/detailfull/national/water/?cid=stelprdb1042901
Parking Lot
Bioretention
SDA 1 = 23,000 ft2
Post-Development CN (2-year/15-year) = 82/85
Green Roof
SDA 2 = 25,000 ft2
Post-Development CN (2-year/15-year) =71/78
I-13

Appendix I Acceptable Hydrologic Methods and Models
Eight different model scenarios will be needed with the following inputs/characteristics (Tables
I.7 and I.8).
Table I.7 SDA 1 TR-55 Model Scenarios for Example 1b.
Input
2- Year
Predevelopment
2-Year Post-
Development
15-Year Pre-
Project
15-Year Post-
Development
Area 0.53 acre
Curve Number 70 82 74 85
Time of
Concentration1 0.1 hour
Rainfall Depth2 3.14 inches 3.14 inches 5.23 inches 5.23 inches
Table I.8 SDA 2 TR-55 Model Scenarios for Example 1b.
Input
2- Year
Predevelopment
2-Year Post-
Development
15-Year Pre-
Project
15-Year Post-
Development
Area 0.57 acre
Curve Number 70 71 86 78
Time of
Concentration1 0.1 hour
Rainfall Depth2 3.14 inches 3.14 inches 5.23 inches 5.23 inches
1. Actual drainage characteristics (flow lengths, slopes, etc.) shall be used, but the minimum Tc
must be 6 minutes (0.1 hours).
2. The NRCS Type II Storm Event shall be used.
Using these inputs, WinTR-55 can produce peak flow rates for the various scenarios (Table I.9).
Table I.9 Example 1b Peak Flow Rates for SDA 1 and SDA 2.
SDA
2- Year
Predevelopment
Peak Flow
2-Year Post-
Development
Peak Flow
15-Year Pre-
Project Peak
Flow
15-Year Post-
Development
Peak Flow
SDA 1 0.59 cfs 1.22 cfs 2.09 cfs 2.88 cfs
SDA 2 0.64 cfs 0.69 cfs 3.17 cfs 2.55 cfs
Total1 1.23 cfs 1.91 cfs 5.26 cfs 5.43 cfs
1. In this example, the timing of peak flows was very similar for each SDA, so the peak flows
could simply be added to determine the total site peak flows. If the peak times between different
SDAs are different, then the total site peak flows will be less than the sum of the peak flows from
each SDA.
Step 3: Determine the peak flow reduction targets.
From Table I.9 it is clear that the majority of the detention needs are in SDA 1. For SDA 2, the
2-year post-development peak flow is only slightly higher than the predevelopment peak flow,
and the 15-year post-development peak flow is lower than the post-development peak flow. So,
I-14

Appendix I Acceptable Hydrologic Methods and Models
underground detention is proposed only in SDA 1. In order to reduce the total site 2-year post-
development peak flow to the pre-development rate of 1.23 cfs, the 2-year post-development
peak flow in SDA 1 will need to be reduced from 1.22 cfs to 0.54 cfs.
1.91 𝑐𝑓𝑠 − 1.23 𝑐𝑓𝑠 = 0.68 𝑐𝑓𝑠
1.22 𝑐𝑓𝑠 − 0.68 𝑐𝑓𝑠 = 0.54 𝑐𝑓𝑠
To reduce the total site 15-year post-development peak flow to 5.26 cfs, the 15-year post-
development peak flow in SDA 1 will need to be reduced from 2.88 cfs to 2.71 cfs.
5.43 𝑐𝑓𝑠 − 5.26 𝑐𝑓𝑠 = 0.17 𝑐𝑓𝑠
2.88 𝑐𝑓𝑠 − 0.17 𝑐𝑓𝑠 = 2.71 𝑐𝑓𝑠
Step 4: Set up the stage-storage tables with the post-development hydrographs for the 2-
year storm.
The hydrograph tables produced by WinTR-55 (Select WinTR-20 Reports → Printed Page File)
can be pasted into a spreadsheet. Starting with the time increments and the flow rates from the
hydrograph, a simple conversion will yield the volume of water that enters the storage tank
during each time interval (Figure I.8).
𝑉𝑜𝑙𝑢𝑚𝑒 𝑜𝑓 𝑤𝑎𝑡𝑒𝑟= �𝑇𝑖𝑚𝑒 𝐵 (ℎ𝑟𝑠) − 𝑇𝑖𝑚𝑒 𝐴 (ℎ𝑟𝑠)�× 𝐹𝑙𝑜𝑤 𝐴 (𝑐𝑓𝑠) × 3,600 𝑠𝑒𝑐/ℎ𝑟
Figure I.8 Spreadsheet excerpt for Example 1b.
Once the volume of water entering the storage tank per time increment is determined, a tank size
and an orifice size must be assumed. This will be an iterative process to determine the smallest
tank size that is sufficient to meet the detention requirements for both the 2-year and 15-year
storm event. In this case, a 4-foot high, 8-foot wide arch pipe-type tank will be used, and the
length will be modified as needed to meet the detention requirements (Figure I.9).
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
11.432 0.05 7.92
11.476 0.06 9.50
11.52 0.07 11.09
11.565 0.1 16.20
11.609 0.13 20.59
11.653 0.21 33.26
I-15

Appendix I Acceptable Hydrologic Methods and Models
Figure I.9. Cross sectional view of arch pipe tank.
It is essential to know the cross-sectional area in the tank per unit of depth in the tank. For this
example, the cross-sectional area varies with water depth according to Table I.10.
Table I.10 Depth Versus Area for Example Arch Pipe Tank
Depth (ft)
Cross-Sectional
Area of Tank (ft2)
0.0 0.00
0.5 4.02
1.0 7.95
1.5 11.74
2.0 15.34
2.5 18.64
3.0 21.53
3.5 23.85
4.0 25.12
From the data in Table I.10, the relationship between area and depth for this specific design can
be expressed as follows:
𝐷 = 2.192 × 10
−7(𝐴6) − 1.529 × 10−5(𝐴5) + 4.043 × 10−4(𝐴4) − 4.951 × 10−3(𝐴3)
+ 2.789 × 10−2(𝐴2) + 6.906 × 10−2(𝐴)
where:
D  =  Depth of water in the arch pipe (ft)
A  =  Cross-sectional area of water in the arch pipe (ft
2)
I-16

Appendix I Acceptable Hydrologic Methods and Models
With an assumed length of 40 feet of tank, and the cross section equation above, the 7.92 cubic
feet of water in the tank in the first time interval produces a depth of water of 0.015 feet (Figure
I.10).
𝐴𝑟𝑒𝑎 =  𝑉𝑜𝑙𝑢𝑚𝑒 𝑜𝑓 𝑊𝑎𝑡𝑒𝑟 𝑖𝑛 𝑇𝑎𝑛𝑘
𝐿𝑒𝑛𝑔𝑡ℎ 𝑜𝑓 𝑇𝑎𝑛𝑘 = 7.92 𝑐𝑓
40 𝑐𝑓 = 0.20 𝑓𝑡2
𝐷 = 2.192 × 10−7(0.206) − 1.529 × 10−5(0.205) + 4.043 × 10−4(0.204) − 4.951
× 10−3(0.203) + 2.789 × 10−2(0.202) + 6.906 × 10−2(0.20) = 0.015 𝑓𝑡
Figure I.10 Spreadsheet excerpt for Example 1b.
Next, assume an orifice size. With a known depth in the tank, the outflow from the orifice is
calculated based on these two equations from Appendix H.1 - Circular Orifices.
𝑄 = 𝐶𝐴(2𝑔ℎ)
0.5
where:
Q = orifice discharge (cfs)
C = discharge coefficient = 0.6
A = orifice cross-sectional area (ft2) =
D = diameter of orifice (ft)
g = gravitational acceleration (32.2 ft/s2)
h = hydraulic head above the center of the orifice (ft)
When h < D, the orifice shall be treated as a weir:
𝑄 = 𝐶𝐿𝐻3/2
where:
Q = flow through the weir (cfs)
C = discharge coefficient = 3
L = diameter of orifice (ft)
H = hydraulic head above bottom of weir opening (ft)
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in Tank
(ft)
11.432 0.05 7.92 7.92 0.20 0.015
41416.3
2D×
I-17

Appendix I Acceptable Hydrologic Methods and Models
Assuming a 6-inch orifice (0.5 feet), the 0.015-foot depth in the tank yields:
𝑄 = 𝐶𝐿𝐻3/2 = 3 × 0.5 𝑓𝑡 × (0.015 𝑓𝑡)3/2 = 0.003 𝑐𝑓𝑠
The outflow in the first time interval is then used to determine the volume and depth of water in
the tank in the second time interval (Figure I.11).
𝑉𝑜𝑙𝑢𝑚𝑒 𝑖𝑛 𝑇𝑎𝑛𝑘
= 𝑉𝑜𝑙𝑢𝑚𝑒 𝑓𝑟𝑜𝑚 𝑝𝑟𝑒𝑣𝑖𝑜𝑢𝑠 𝑡𝑖𝑚𝑒 𝑖𝑛𝑡𝑒𝑟𝑣𝑎𝑙
− 𝑂𝑢𝑡𝑓𝑙𝑜𝑤 𝑖𝑛 𝑝𝑟𝑒𝑣𝑖𝑜𝑢𝑠 𝑡𝑖𝑚𝑒 𝑖𝑛𝑡𝑒𝑟𝑣𝑎𝑙
+ 𝐼𝑛𝑓𝑙𝑜𝑤 𝑖𝑛 𝑡ℎ𝑒 𝑐𝑢𝑟𝑟𝑒𝑛𝑡 𝑡𝑖𝑚𝑒 𝑖𝑛𝑡𝑒𝑟𝑣𝑎𝑙
𝑉𝑜𝑙𝑢𝑚𝑒 𝑖𝑛 𝑇𝑎𝑛𝑘 = 7.92 𝑐𝑓 − 0.003 𝑐𝑓𝑠 × 0.044 ℎ𝑟 × 3600 𝑠𝑒𝑐
ℎ𝑟 + 9.5 𝑐𝑓 = 17.00 𝑐𝑓
Figure I.11 Spreadsheet excerpt for Example 1b.
At this point, the cycle repeats. The volume in the tank yields a depth calculation, which yields
an orifice outflow calculation, which combines with the next inflow volume to yield a new
volume in the tank. This calculation process is repeated for every time interval in the spreadsheet
(Figure I.12).
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in Tank
(ft)
Outflow
(cfs)
11.432 0.05 7.92 7.92 0.20 0.015 0.003
11.476 0.06 9.50 17.00 0.42 0.034 0.009
I-18

Appendix I Acceptable Hydrologic Methods and Models
Figure I.12 Spreadsheet excerpt for Example 1b.
When this is complete, the designer can determine if the storage tank is big enough so that it
does not overflow (but not too big) and if the peak outflow rate is below the required target. The
length of the tank and the orifice can be adjusted to compensate as needed. In this case, it appears
that the orifice is too big to keep the outflow rate below the 0.54 cfs target. The depth of water in
the tank rises to just over 1 foot, while the peak outflow is 0.987 cfs. Reducing the orifice to 3
inches yields a new peak outflow of 0.407 cfs (Figure I.13).
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in Tank
(ft)
Outflow
(cfs)
11.432 0.05 7.92 7.92 0.20 0.015 0.003
11.476 0.06 9.50 17.00 0.42 0.034 0.009
11.52 0.07 11.09 26.60 0.66 0.057 0.020
11.565 0.1 16.20 39.50 0.99 0.091 0.041
11.609 0.13 20.59 53.57 1.34 0.132 0.072
11.653 0.21 33.26 75.46 1.89 0.201 0.135
11.697 0.28 44.35 98.39 2.46 0.278 0.220
11.741 0.4 63.36 126.85 3.17 0.378 0.348
11.786 0.53 85.86 156.28 3.91 0.481 0.501
11.83 0.73 115.63 192.57 4.81 0.607 0.734
11.874 1.07 169.49 245.77 6.14 0.783 0.834
11.918 1.22 193.25 306.84 7.67 0.975 0.931
11.962 1.12 177.41 336.71 8.42 1.066 0.974
12.007 1.03 166.86 345.71 8.64 1.094 0.987
12.051 0.65 102.96 292.33 7.31 0.930 0.910
12.095 0.36 57.02 205.26 5.13 0.650 0.760
12.139 0.25 39.60 124.51 3.11 0.370 0.337
12.184 0.21 34.02 103.94 2.60 0.298 0.244
12.228 0.19 30.10 95.46 2.39 0.268 0.209
12.272 0.18 28.51 90.95 2.27 0.253 0.191
12.316 0.17 26.93 87.65 2.19 0.242 0.178
12.36 0.15 23.76 83.17 2.08 0.227 0.162
12.405 0.15 24.30 81.25 2.03 0.220 0.155
12.449 0.13 20.59 77.29 1.93 0.207 0.141
12.493 0.12 19.01 73.91 1.85 0.196 0.130
12.537 0.11 17.42 70.72 1.77 0.186 0.120
I-19

Appendix I Acceptable Hydrologic Methods and Models
Figure I.13 Spreadsheet excerpt for Example 1b.
The maximum depth in the tank is 2.96 feet, well below the 4.0-foot tank height. Reducing the
length of the tank would increase the depth of water to better utilize the tank volume, but it will
also increase the flow rate out of the orifice. It is important to find the right balance between tank
size and orifice size. Before effort is taken to optimize the tank size for the 2-year storm, the next
step is to analyze the tank’s response to the 15-year storm.
Step 5: Set up the stage-storage tables with the post-development hydrographs for the
15-year storm.
As stated above, the 15-year post-development peak flow must be reduced from 2.88 cfs to 2.71
cfs. The stage-storage table for the 15-year storm is set up in the same manner as the table for the
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in Tank
(ft)
Outflow
(cfs)
11.432 0.05 7.92 7.92 0.20 0.015 0.001
11.476 0.06 9.50 17.21 0.43 0.034 0.005
11.52 0.07 11.09 27.54 0.69 0.059 0.011
11.565 0.1 16.20 41.99 1.05 0.098 0.023
11.609 0.13 20.59 58.94 1.47 0.148 0.043
11.653 0.21 33.26 85.42 2.14 0.234 0.085
11.697 0.28 44.35 116.31 2.91 0.341 0.138
11.741 0.4 63.36 157.87 3.95 0.487 0.165
11.786 0.53 85.86 217.07 5.43 0.689 0.196
11.83 0.73 115.63 301.67 7.54 0.959 0.231
11.874 1.07 169.49 434.53 10.86 1.372 0.277
11.918 1.22 193.25 583.96 14.60 1.895 0.325
11.962 1.12 177.41 709.86 17.75 2.372 0.364
12.007 1.03 166.86 817.76 20.44 2.789 0.395
12.051 0.65 102.96 858.22 21.46 2.961 0.407
12.095 0.36 57.02 850.84 21.27 2.928 0.404
12.139 0.25 39.60 826.40 20.66 2.824 0.397
12.184 0.21 34.02 796.10 19.90 2.703 0.388
12.228 0.19 30.10 764.67 19.12 2.581 0.380
12.272 0.18 28.51 733.05 18.33 2.461 0.371
12.316 0.17 26.93 701.28 17.53 2.340 0.361
12.36 0.15 23.76 667.79 16.69 2.212 0.351
12.405 0.15 24.30 635.17 15.88 2.088 0.341
12.449 0.13 20.59 601.68 15.04 1.962 0.331
12.493 0.12 19.01 568.28 14.21 1.837 0.320
12.537 0.11 17.42 534.99 13.37 1.716 0.309
I-20

Appendix I Acceptable Hydrologic Methods and Models
2-year storm; the only difference will be the time and flow inputs from the hydrograph. The TR-
55 inputs for the 15-year storm yield the following stage-storage table (Figure I.14).
Figure I.14 Spreadsheet excerpt for Example 1b. (Note: the first few rows were removed to
fit the table on the page).
With our 40-foot tank and 3-inch orifice, the peak 15-year outflow will be 2.607 cfs, which
meets our target. However, the depth of water in the tank is 121 feet – much higher than the
actual 4-foot tank height. More storage will be required, as well as a second orifice to increase
the outflow allowed during the 15-year flow without affecting the 2-year results. This is done by
setting the second orifice invert at the highest tank depth for the 2-year storm and revising the
orifice equations accordingly. The 2-year flow topped out at 2.96 feet, so a second orifice will be
set there. The outflow equations used are the same, with adjustments made for the elevation of
the orifice (no water will flow out of the orifice until the water depth exceeds 2.96 feet).
Assuming a 6-inch orifice, the spreadsheet is updated as shown in Figure I.15.
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in Tank
(ft)
Outflow
(cfs)
11.016 0.11 17.42 90.41 2.26 0.251 0.118
11.061 0.12 19.44 90.74 2.27 0.252 0.118
11.105 0.12 19.01 91.02 2.28 0.253 0.118
11.149 0.13 20.59 92.85 2.32 0.259 0.120
11.193 0.14 22.18 96.03 2.40 0.270 0.122
11.237 0.15 23.76 100.39 2.51 0.285 0.126
11.282 0.16 25.92 105.93 2.65 0.305 0.130
11.326 0.16 25.34 110.68 2.77 0.321 0.134
11.37 0.17 26.93 116.46 2.91 0.341 0.138
11.414 0.18 28.51 123.16 3.08 0.365 0.142
11.459 0.19 30.78 130.88 3.27 0.392 0.148
11.503 0.22 34.85 142.34 3.56 0.432 0.155
11.547 0.33 52.27 170.05 4.25 0.529 0.172
11.591 0.42 66.53 209.39 5.23 0.664 0.192
11.635 0.63 99.79 278.73 6.97 0.887 0.222
11.68 0.83 134.46 377.16 9.43 1.191 0.258
11.724 1.09 172.66 509.00 12.72 1.623 0.301
11.768 1.41 223.34 684.67 17.12 2.277 0.356
11.812 1.81 286.70 914.91 22.87 3.250 0.426
11.856 2.57 407.09 1254.52 31.36 12.679 0.842
11.901 2.88 466.56 1584.75 39.62 89.949 2.242
11.945 2.6 411.84 1641.52 41.04 121.684 2.607
11.989 2.33 369.07 1597.61 39.94 96.429 2.321
12.033 1.54 243.94 1473.91 36.85 48.071 1.639
12.077 0.81 128.30 1342.64 33.57 21.737 1.102
12.122 0.56 90.72 1254.86 31.37 12.705 0.842
I-21

Appendix I Acceptable Hydrologic Methods and Models
Figure I.15 Spreadsheet excerpt for Example 1b. (Note: the first few rows were removed to
fit the table on the page).
The total outflow in the above example is 2.948 cfs with an 8.65-foot depth in the tank; both
values are still too high. Trial and error is needed to determine the right combination of tank size
and orifice sizes to meet the 15-year peak flow requirement. Testing several combinations in this
example led to an ideal tank length of 54 feet, with a 3-inch lower orifice and an 8-inch orifice
set at the 2-year depth of 2.24 feet (Figure I.16).
Time (hrs) Flow (cfs) Volume
Inflow (cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in Tank
(ft)
Outflow 1
(cfs)
Outflow 2
(cfs)
Total
Outflow
11.016 0.11 17.42 90.41 2.26 0.251 0.118 0.000 0.118
11.061 0.12 19.44 90.74 2.27 0.252 0.118 0.000 0.118
11.105 0.12 19.01 91.02 2.28 0.253 0.118 0.000 0.118
11.149 0.13 20.59 92.85 2.32 0.259 0.120 0.000 0.120
11.193 0.14 22.18 96.03 2.40 0.270 0.122 0.000 0.122
11.237 0.15 23.76 100.39 2.51 0.285 0.126 0.000 0.126
11.282 0.16 25.92 105.93 2.65 0.305 0.130 0.000 0.130
11.326 0.16 25.34 110.68 2.77 0.321 0.134 0.000 0.134
11.37 0.17 26.93 116.46 2.91 0.341 0.138 0.000 0.138
11.414 0.18 28.51 123.16 3.08 0.365 0.142 0.000 0.142
11.459 0.19 30.78 130.88 3.27 0.392 0.148 0.000 0.148
11.503 0.22 34.85 142.34 3.56 0.432 0.155 0.000 0.155
11.547 0.33 52.27 170.05 4.25 0.529 0.172 0.000 0.172
11.591 0.42 66.53 209.39 5.23 0.664 0.192 0.000 0.192
11.635 0.63 99.79 278.73 6.97 0.887 0.222 0.000 0.222
11.68 0.83 134.46 377.16 9.43 1.191 0.258 0.000 0.258
11.724 1.09 172.66 509.00 12.72 1.623 0.301 0.000 0.301
11.768 1.41 223.34 684.67 17.12 2.277 0.356 0.000 0.356
11.812 1.81 286.70 914.91 22.87 3.250 0.426 0.506 0.932
11.856 2.57 407.09 1174.35 29.36 8.016 0.669 2.125 2.794
11.901 2.88 466.56 1188.27 29.71 8.645 0.695 2.254 2.948
11.945 2.6 411.84 1133.08 28.33 6.494 0.602 1.776 2.379
11.989 2.33 369.07 1125.39 28.13 6.260 0.591 1.716 2.308
12.033 1.54 243.94 1003.78 25.09 3.969 0.471 0.948 1.418
12.077 0.81 128.30 907.42 22.69 3.207 0.423 0.467 0.890
12.122 0.56 90.72 854.01 21.35 2.942 0.405 0.000 0.405
12.166 0.46 72.86 862.68 21.57 2.981 0.408 0.125 0.533
12.21 0.41 64.94 843.24 21.08 2.895 0.402 0.000 0.402
I-22

Appendix I Acceptable Hydrologic Methods and Models
Figure I.16 Spreadsheet excerpt for Example 1b. (Note: the first few rows were removed to
fit the table on the page).
This final arrangement of tank length and orifices yields a 15-year peak outflow of 2.66 cfs and a
maximum depth of 3.91 feet, so the 2.71 cfs target is met. Checking this arrangement against the
2-year flows yields a 2-year peak outflow of 0.35 cfs and a maximum depth of 2.24 feet, so the
0.54 cfs target is met (Figures I.17 and I.18). Therefore, detention requirements for the site are
met.
Time (hrs) Flow (cfs) Volume
Inflow (cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in Tank
(ft)
Outflow 1
(cfs)
Outflow 2
(cfs)
Total
Outflow
11.016 0.11 17.42 122.17 2.26 0.251 0.118 0.000 0.118
11.061 0.12 19.44 122.49 2.27 0.252 0.118 0.000 0.118
11.105 0.12 19.01 122.77 2.27 0.253 0.118 0.000 0.118
11.149 0.13 20.59 124.60 2.31 0.258 0.119 0.000 0.119
11.193 0.14 22.18 127.85 2.37 0.266 0.121 0.000 0.121
11.237 0.15 23.76 132.38 2.45 0.277 0.124 0.000 0.124
11.282 0.16 25.92 138.21 2.56 0.292 0.127 0.000 0.127
11.326 0.16 25.34 143.39 2.66 0.305 0.130 0.000 0.130
11.37 0.17 26.93 149.69 2.77 0.322 0.134 0.000 0.134
11.414 0.18 28.51 157.03 2.91 0.341 0.138 0.000 0.138
11.459 0.19 30.78 165.52 3.07 0.363 0.142 0.000 0.142
11.503 0.22 34.85 177.87 3.29 0.395 0.148 0.000 0.148
11.547 0.33 52.27 206.67 3.83 0.470 0.162 0.000 0.162
11.591 0.42 66.53 247.58 4.58 0.575 0.179 0.000 0.179
11.635 0.63 99.79 319.02 5.91 0.752 0.205 0.000 0.205
11.68 0.83 134.46 420.31 7.78 0.988 0.235 0.000 0.235
11.724 1.09 172.66 555.78 10.29 1.299 0.269 0.000 0.269
11.768 1.41 223.34 736.49 13.64 1.754 0.313 0.000 0.313
11.812 1.81 286.70 973.65 18.03 2.416 0.367 0.701 1.068
11.856 2.57 407.09 1211.56 22.44 3.153 0.420 1.617 2.037
11.901 2.88 466.56 1348.17 24.97 3.913 0.467 2.192 2.660
11.945 2.6 411.84 1338.73 24.79 3.840 0.463 2.144 2.607
11.989 2.33 369.07 1294.82 23.98 3.551 0.445 1.940 2.385
12.033 1.54 243.94 1160.97 21.50 2.969 0.407 1.444 1.851
12.077 0.81 128.30 996.02 18.44 2.479 0.372 0.820 1.192
12.122 0.56 90.72 893.62 16.55 2.190 0.350 0.000 0.350
I-23

Appendix I Acceptable Hydrologic Methods and Models
Figure I.17 Inflow vs. detained outflow for Example 1b 15-year storm.
Figure I.18 Inflow vs. detained outflow for Example 1b 2-year storm.
Example 2
Example 2 describes a unique detention situation in which the development includes both major
substantial improvement and major land disturbing activities.
A 36,000 square foot development is proposed on Type B soils. The development has one SDA
and includes a 15,000 square foot building that will be renovated, qualifying it as a major
substantial improvement (MSI) project. A green roof will be added to the building to meet the
SWRv requirements. The remaining 21,000 square feet will be a major land disturbing project
I-24

Appendix I Acceptable Hydrologic Methods and Models
(MLD), a mix of impervious cover and turf cover, with bioretention areas used to meet the
SWRv requirements (Figure I.19).
For the MLD area, detention must be provided to meet the predevelopment peak flow for the 2-
year storm and the pre-project peak flow for the 15-year storm. Peak flows may be analyzed for
the whole site, so the predevelopment peak discharge for the MSI area can be included in the
analysis. In other words, the allowable discharge from the site for the 2-year storm is equal to the
predevelopment peak flow from the MLD area plus the pre-project peak flow from the MSI area.
The allowable discharge from the site for the 15-year storm is equal to the pre-project peak flow
from the MLD area plus the pre-project peak flow from the MSI area.
Predevelopment conditions on Type B soils equate to a curve number of 58. In the MSI, pre-
project conditions are entirely impervious cover for a curve number of 98. Pre-project conditions
in the MLD include both impervious and turf areas yielding a curve number of 79. These values
are indicated in Table I.11. Based on the proposed land covers and the implementation of the
green roof and bioretention areas (which serve to reduce curve numbers), the post-development
curve numbers are also indicated in Table I.11.
Figure I.19 Site diagram for Example 2.
Table I.11 Example 2 Curve Numbers.
Area
Predevelopment
Curve Number
2-Year Post-
Development
Curve
Number1
Pre-Project
Curve
Number
15-Year Post-
Development
Curve
Number1
MSI Area 15,000 ft2 N/A 86 98 88
MLD Area 21,000 ft2 58 76 79 80
Total Site 36,000 ft2 752 80 87 83
1. These values incorporate the reductions achieved due to the implementation of the
bioretention area and the green roof.
2. As described above, the pre-project curve number of 98 for the MSI area is used to calculate
the total site predevelopment curve number since detention is not required for the MSI area.
Step 1: Determine if detention is required.
Detention rules apply to the site as a whole rather than the individual SDAs, so to determine if
detention is required, compare the curve numbers for the total site. For the total site, the 2-year
post development curve number of 80 is greater than the predevelopment curve number of 75, so
detention is required for the 2-year storm. The 15-year post-development curve number of 83 is
less than the pre-project curve number of 87, so detention is not needed for the 15-year storm.
  21,000 ft2
Disturbance
15,000 ft2
Building to
be Renovated
(with Green
Roof Added)
Total Site = 36,000 ft2
Post-Development CN (2-year/15-year) = 80/83
Bioretention
I-25

Appendix I Acceptable Hydrologic Methods and Models
Step 2: Calculate the predevelopment and post-development peak flows.
There are several programs available for developing runoff hydrographs. The WinTR-55
program will be used in this example. The WinTR-55 program and support materials, including
the User Guide can be found here:
https://www.nrcs.usda.gov/wps/portal/nrcs/detailfull/national/water/?cid=stelprdb1042901
Since there is only one SDA for this site, only two model scenarios will be needed, with the
following inputs/characteristics (Table I.12).
Table I.12 TR-55 Model Scenarios for Example 2.
Input
2- Year
Predevelopment
2-Year Post-
Development
Area 0.83 acre
Curve Number 75 80
Time of Concentration1 0.1 hour
Rainfall Depth2 3.14 inches
1. Actual drainage characteristics (flow lengths, slopes, etc.) shall be used, but the minimum Tc
must be 6 minutes (0.1 hours).
2. The NRCS Type II Storm Event shall be used.
Using these inputs, WinTR-55 can produce peak flow rates for the site (Table I.13).
Table I.13 Peak flows for Example 2.
 2- Year Predevelopment
Peak Flow
2-Year Post-Development
Peak Flow
Total  1.31 cfs 1.73 cfs
Step 3: Determine the peak flow reduction targets.
Table I.13 clearly shows that detention is needed on the site. Underground detention is proposed
to capture runoff from the total site and reduce the peak flow. In order to reduce the total site 2-
year post-development peak flow to the predevelopment rate, the 2-year post-development peak
flow-in will need to be reduced from 1.73 cfs to 1.31 cfs.
Step 4: Set up the stage-storage tables with the post-development hydrographs for the 2-
year storm.
The hydrograph tables produced by WinTR-55 (Select WinTR-20 Reports → Printed Page File)
can be pasted into a spreadsheet. Starting with the time increments and the flow rates from the
hydrograph, a simple conversion will yield the volume of water that enters the storage tank
during each time interval (Figure I.20).
𝑉𝑜𝑙𝑢𝑚𝑒 𝑜𝑓 𝑤𝑎𝑡𝑒𝑟= �𝑇𝑖𝑚𝑒 𝐵 (ℎ𝑟𝑠) − 𝑇𝑖𝑚𝑒 𝐴 (ℎ𝑟𝑠)�× 𝐹𝑙𝑜𝑤 𝐴 (𝑐𝑓𝑠) × 3,600 𝑠𝑒𝑐/ℎ𝑟
I-26

Appendix I Acceptable Hydrologic Methods and Models
Figure I.20 Spreadsheet excerpt for Example 2.
Once the volume of water entering the storage tank per time increment is determined, a tank size
and an orifice size must be assumed. This will be an iterative process to determine the smallest
tank size that is sufficient to meet the detention requirements for the 2-year storm event. In this
case, an 8-foot wide, 10-foot long rectangular concrete tank will be used, and the height will be
modified as needed to meet the detention requirements (Figure I.21).
Figure I.21 Detention tank for Example 2.
The cross-sectional area for any depth of water in the tank is 80 square feet.
With the cross section of 80 square feet, the 7.92 cubic feet of water in the tank in the first time
interval produces a depth of water of 0.099 feet (Figure I.22):
𝐻𝑒𝑖𝑔ℎ𝑡 = 𝑉𝑜𝑙𝑢𝑚𝑒 𝑜𝑓 𝑊𝑎𝑡𝑒𝑟 𝑖𝑛 𝑇𝑎𝑛𝑘
𝐴𝑟𝑒𝑎 𝑜𝑓 𝑇𝑎𝑛𝑘 = 7.92 𝑐𝑢𝑏𝑖𝑐 𝑓𝑒𝑒𝑡
80 𝑠𝑞𝑢𝑎𝑟𝑒 𝑓𝑒𝑒𝑡= 0.099 𝑓𝑒𝑒𝑡
Figure I.22 Spreadsheet excerpt for Example 2.
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
11.309 0.05 7.92
11.353 0.06 9.50
11.397 0.06 9.50
11.441 0.06 9.50
11.486 0.07 11.34
11.53 0.09 14.26
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in
Tank (ft)
11.309 0.05 7.92 7.92 80.00 0.099
I-27

Appendix I Acceptable Hydrologic Methods and Models
Next, assume an orifice size. With a known depth in the tank, the outflow from the orifice is
calculated based on these two equations from Appendix H.1 - Circular Orifices.
𝑄 = 𝐶𝐴(2𝑔ℎ)0.5
where:
Q = orifice discharge (cfs)
C = discharge coefficient = 0.6
A = orifice cross-sectional area (ft2) =
D = diameter of orifice (ft)
g = gravitational acceleration (32.2 ft/s2)
h = hydraulic head above the center of the orifice (ft)
When h < D, the orifice shall be treated as a weir:
𝑄 = 𝐶𝐿𝐻3/2
where:
Q = flow through the weir (cfs)
C = discharge coefficient = 3
L = diameter of orifice (ft)
H = hydraulic head above bottom of weir opening (ft)
Assuming a 3-inch orifice (0.25 feet), the 0.099-foot depth in the tank yields:
𝑄 = 𝐶𝐿𝐻3/2 = 3 x 0.25 ft x (0.099 ft)3/2= 0.023 cfs
The outflow in the first time interval is then used to determine the volume and depth of water in
the tank in the second time interval (Figure I.23).
𝑉𝑜𝑙𝑢𝑚𝑒 𝑖𝑛 𝑇𝑎𝑛𝑘
= 𝑉𝑜𝑙𝑢𝑚𝑒 𝑓𝑟𝑜𝑚 𝑝𝑟𝑒𝑣𝑖𝑜𝑢𝑠 𝑡𝑖𝑚𝑒 𝑖𝑛𝑡𝑒𝑟𝑣𝑎𝑙
− 𝑂𝑢𝑡𝑓𝑙𝑜𝑤 𝑖𝑛 𝑝𝑟𝑒𝑣𝑖𝑜𝑢𝑠 𝑡𝑖𝑚𝑒 𝑖𝑛𝑡𝑒𝑟𝑣𝑎𝑙
+ 𝐼𝑛𝑓𝑙𝑜𝑤 𝑖𝑛 𝑡ℎ𝑒 𝑐𝑢𝑟𝑟𝑒𝑛𝑡 𝑡𝑖𝑚𝑒 𝑖𝑛𝑡𝑒𝑟𝑣𝑎𝑙
𝑉𝑜𝑙𝑢𝑚𝑒 𝑖𝑛 𝑇𝑎𝑛𝑘 = 7.92 𝑐𝑓 − 0.023 𝑐𝑓𝑠 × 0.044 ℎ𝑟 × 3600 𝑠𝑒𝑐
ℎ𝑟 + 9.50 𝑐𝑓 = 13.72 𝑐𝑓
41416.3
2D×
I-28

Appendix I Acceptable Hydrologic Methods and Models
Figure I.23 Spreadsheet excerpt for Example 2.
At this point, the cycle repeats. The volume in the tank yields a depth calculation, which yields
an orifice outflow calculation, which combines with the next inflow volume to yield a new
volume in the tank. This calculation process is repeated for every time interval in the spreadsheet
(Figure I.24).
Figure I.24 Spreadsheet excerpt for Example 2.
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in
Tank (ft)
Outflow
(cfs)
11.309 0.05 7.92 7.92 80.00 0.099 0.023
11.353 0.06 9.50 13.72 80.00 0.172 0.053
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in
Tank (ft)
Outflow
(cfs)
11.309 0.05 7.92 7.92 80.00 0.099 0.023
11.353 0.06 9.50 13.72 80.00 0.172 0.053
11.397 0.06 9.50 14.79 80.00 0.185 0.060
11.441 0.06 9.50 14.85 80.00 0.186 0.060
11.486 0.07 11.34 16.47 80.00 0.206 0.070
11.53 0.09 14.26 19.63 80.00 0.245 0.091
11.574 0.13 20.59 25.78 80.00 0.322 0.134
11.618 0.18 28.51 33.10 80.00 0.414 0.152
11.662 0.29 45.94 55.01 80.00 0.688 0.196
11.707 0.38 61.56 84.87 80.00 1.061 0.243
11.751 0.55 87.12 133.46 80.00 1.668 0.305
11.795 0.73 115.63 200.77 80.00 2.510 0.374
11.839 1.04 164.74 306.22 80.00 3.828 0.462
11.883 1.53 242.35 475.34 80.00 5.942 0.576
11.928 1.73 280.26 662.28 80.00 8.279 0.680
11.972 1.6 253.44 808.01 80.00 10.100 0.751
12.016 1.46 231.26 920.31 80.00 11.504 0.802
12.06 0.9 142.56 935.89 80.00 11.699 0.808
12.104 0.5 79.20 887.05 80.00 11.088 0.787
12.149 0.36 58.32 817.88 80.00 10.224 0.756
12.193 0.31 49.10 747.29 80.00 9.341 0.722
12.237 0.28 44.35 677.23 80.00 8.465 0.688
12.281 0.26 41.18 609.50 80.00 7.619 0.652
12.326 0.24 38.88 542.70 80.00 6.784 0.616
12.37 0.22 34.85 480.06 80.00 6.001 0.579
12.414 0.21 33.26 421.62 80.00 5.270 0.543
12.458 0.19 30.10 365.79 80.00 4.572 0.505
12.502 0.18 28.51 314.26 80.00 3.928 0.468
I-29

Appendix I Acceptable Hydrologic Methods and Models
When this is complete, the designer can determine if the storage tank is large enough such that it
does not overflow (but not too large) and if the peak outflow rate is below the required target. In
this case, the outflow is below the required target, however it is far below. In order to more
closely meet the required flow target and reduce the required height of the tank, the orifice size
can be increased to 4 inches. Increasing the orifice to 4 inches yields a new peak outflow of
1.176 cfs (Figure I.25).
Figure I.25 Spreadsheet excerpt for Example 2.
A peak outflow of 1.176 cfs meets the detention target of 1.31 cfs, and the maximum depth of
water of 7.840 feet can be accommodated by an 8-foot tank height. With this tank design,
detention requirements for the site are met (see Figure I.26).
Time (hrs) Flow (cfs)
Volume
Inflow
(cf)
Volume in
Tank (cf)
Area in
Tank (sf)
Depth in
Tank (ft)
Outflow
(cfs)
11.309 0.05 7.92 7.92 80.00 0.099 0.031
11.353 0.06 9.50 12.49 80.00 0.156 0.062
11.397 0.06 9.50 12.22 80.00 0.153 0.060
11.441 0.06 9.50 12.27 80.00 0.153 0.060
11.486 0.07 11.34 13.88 80.00 0.173 0.072
11.53 0.09 14.26 16.69 80.00 0.209 0.095
11.574 0.13 20.59 22.19 80.00 0.277 0.146
11.618 0.18 28.51 27.56 80.00 0.345 0.246
11.662 0.29 45.94 34.58 80.00 0.432 0.275
11.707 0.38 61.56 51.52 80.00 0.644 0.337
11.751 0.55 87.12 85.34 80.00 1.067 0.433
11.795 0.73 115.63 132.31 80.00 1.654 0.540
11.839 1.04 164.74 211.52 80.00 2.644 0.683
11.883 1.53 242.35 345.70 80.00 4.321 0.873
11.928 1.73 280.26 484.50 80.00 6.056 1.034
11.972 1.6 253.44 574.18 80.00 7.177 1.125
12.016 1.46 231.26 627.17 80.00 7.840 1.176
12.06 0.9 142.56 583.40 80.00 7.292 1.134
12.104 0.5 79.20 482.90 80.00 6.036 1.032
12.149 0.36 58.32 374.01 80.00 4.675 0.908
12.193 0.31 49.10 279.24 80.00 3.491 0.785
12.237 0.28 44.35 199.29 80.00 2.491 0.663
12.281 0.26 41.18 135.48 80.00 1.694 0.546
12.326 0.24 38.88 85.85 80.00 1.073 0.435
12.37 0.22 34.85 51.83 80.00 0.648 0.338
12.414 0.21 33.26 31.63 80.00 0.395 0.263
12.458 0.19 30.10 20.01 80.00 0.250 0.125
12.502 0.18 28.51 28.71 80.00 0.359 0.251
I-30

Appendix I Acceptable Hydrologic Methods and Models
Figure I.26. Example 2 Inflow vs. detained outflow for 2-year storm.
I.4 HEC-1, WinTR-55, TR-20, and SWMM Computer Models
If the application of the above computer models is needed, the complete input data file and
printout will be submitted with the Stormwater Management Plans (SWMPs) at the 85%
submittal stage. Submission of SWMPs shall include the following computer model
documentation:
 For all computer models, supporting computations prepared for the data input file shall be
submitted with the SWMPs.
 Inflow-outflow hydrographs shall be computed for each design storm presented graphically
and submitted for all plans.
 Schematic (node) diagrams must be provided for all routings.
I.5 Rational Method
While this method is not recommended, as it cannot account for the retention/detention benefits
of the BMPs applied on a site, this method will be permitted for use in a development of 5 acres
or less. When applying this method, the following steps must be taken in the design
consideration:
 In the case of more than one site sub-drainage area, the longest time of concentration shall be
selected.
 Individual site sub-drainage flows shall not be summed to get the total flow for the site
drainage area (SDA).
0.2
0.4
0.6
0.8
1.2
1.4
1.6
1.8
11 11.5 12 12.5 13 13.5 14
Flow (cfs)
Time (hrs)
Inflow (cfs)
Outflow (cfs)
I-31

Appendix I Acceptable Hydrologic Methods and Models
 The runoff coefficient, C, shall be a composite of the future site development conditions for
all contributing areas to the discharge point. Runoff coefficient factors for typical District
land uses are provided in Table I.1.
 The flow time in storm sewers shall be taken into account in computing the SDA time of
concentration.
 The storm duration shall be dependent upon the SDA time of concentration.
 The storm intensity can be selected from the selected storm duration.
Table I.1 Runoff Coefficient Factors for Typical District of Columbia Land Uses
Zone Predominant Use
Minimum Lot Dimensions
Runoff
Coefficient C Width
(ft)
Area
(ft2)
R-1-A One-family detached dwelling 75 7,500 0.60
R-1-B One-family detached dwelling 50 5,000 0.65
R-2 One-family semi-detached dwelling 30 3,000 0.65
R-3 Row dwelling 20 2,000 0.70
RF-1 Row dwelling 18 1,800 0.75
RA-1 Low density apartment – – 0.70
RA-2 Medium density apartment house – – 0.75
RA-3 Medium high density apartment house – – 0.80
RA-5 High density building – – 0.80
C Commercial – – 0.85–0.95
M General Industry – – 0.80–0.90
Park Open green space – – 0.35
I.6 Stormwater Volume Peak Discharge
The peak rate of discharge for individual design storms may be required for several different
components of water quality BMP design. While the primary design and sizing factor for most
stormwater retention BMPs is the design SWRv, several design elements will require a peak rate
of discharge for specified design storms. The design and sizing of pretreatment cells, level
spreaders, by-pass diversion structures, overflow riser structures, grass swales, water quality
swale geometry, etc., all require a peak rate of discharge in order to ensure non-erosive
conditions and flow capacity.
The peak rate of discharge from a SDA can be calculated from any one of several calculation
methods discussed in this appendix. The two most commonly used methods of computing peak
I-32

Appendix I Acceptable Hydrologic Methods and Models
discharges for peak runoff calculations and drainage system design are NRCS TR-55 CN
methods (NRCS TR-55, 1986) and the Rational Formula. The Rational Formula is highly
sensitive to the time of concentration and rainfall intensity, and therefore should only be used
with reliable Intensity-Duration-Frequency (IDF) curves or tables for the rainfall depth and
region of interest (Claytor and Schueler, 1996). Unfortunately, there are no IDF curves available
at this time for the 1.2-inch rainfall depth.
The NRCS CN methods are very useful for characterizing complex sub-watersheds and SDAs
and estimating the peak discharge from large storms (greater than 2 inches), but can significantly
underestimate the discharge from small storm events (Claytor and Schueler, 1996). Since the
SWRv is based on a 1.2-inch rainfall, this underestimation of peak discharge can lead to
undersized diversion and overflow structures, potentially bypassing a significant volume of the
design SWRv around the retention practice. Undersized overflow structures and outlet channels
can cause erosion of the BMP conveyance features that can lead to costly and frequent
maintenance.
In order to maintain consistency and accuracy, the following Modified CN Method is
recommended to calculate the peak discharge for the SWRv 1.2-inch rain event. The method
utilizes the Small Storm Hydrology Method (Pitt, 1994) and NRCS Graphical Peak Discharge
Method (USDA, 1986) to provide an adjusted CN that is more reflective of the runoff volume
from impervious areas within the SDA. The design rainfall is a NRCS type II distribution so the
method incorporates the peak rainfall intensities common in the eastern United States, and the
time of concentration is computed using the method outlined in TR-55.
The following steps describe how to calculate the SWRv peak rate of discharge (
qpSWRv):
Step 1: Calculate the adjusted CN for the site or contributing drainage area (CDA).
The following equation is derived from the NRCS CN Method and is described in detail in the
National Engineering Handbook Chapter 4: Hydrology (NEH-4), and NRCS TR-55 Chapter 2:
Estimating Runoff:
𝐶𝑁 = 1,000
[10 + 5𝑃 + 10𝑄𝑎 − 10(𝑄𝑎2 + 1.25𝑄𝑎𝑃)0.5
where:
CN = adjusted curve number
P = rainfall (in.), (1.2 in.)
Qa = runoff volume (watershed inches), equal to SWRv divided by CDA
Note: When using hydraulic/hydrologic model for sizing a retention BMP or calculating the
SWRv peak discharge, designers must use this modified CN for the CDA to generate runoff
equal to the SWRv for the 1.2-inch rainfall event.
Step 2: Compute the CDA Time of Concentration (Tc).
I-33

Appendix I Acceptable Hydrologic Methods and Models
TR-55 Chapter 3: Time of Concentration and Travel Time provides a detailed procedure for
computing the Tc.
Step 3: Calculate the Stormwater Retention Volume peak discharge (qpSWRv)
The qpSWRv is computed using the following equation and the procedures outlined in TR-55,
Chapter 4: Graphical Peak Discharge Method. Designers can also use WinTR-55 or an
equivalent TR-55 spreadsheet to compute qpSWRv:
 Read initial abstraction (Ia) from TR-55 Table 4.1 or calculate using Ia = 200/CN - 2
 Compute Ia/P (P = 1.2)
 Read the Unit Peak Discharge (qu) from exhibit 4-II using Tc and Ia/P
 Compute the qpSWRv peak discharge:
𝑞𝑝𝑆𝑊𝑅𝑣 = 𝑞𝑢 × 𝐴 × 𝑄𝑎
27,878,400
where:
qpSWRv = Stormwater Retention Volume peak discharge (cfs)
qu   = unit peak discharge (cfs/mi2/in.)
A   = contributing drainage area (ft2)
Qa    = runoff volume (watershed inches = SWRv/A)
27,878,400  = conversion from square miles to square feet
This procedure is for computing the peak flow rate for the 1.2-inch rainfall event. All other
calculations of peak discharge from larger storm events for the design of drainage systems,
culverts, etc., should use published CNs and computational procedures.
I.7 References
Claytor, R. and T. Schueler. 1996. Design of Stormwater Filtering Systems. Chesapeake
Research Consortium and the Center for Watershed Protection. Ellicott City, MD.
https://owl.cwp.org/
Pitt, R., 1994, Small Storm Hydrology. University of Alabama - Birmingham. Unpublished
manuscript. Presented at design of stormwater quality management practices. Madison, WI,
May 17-19 1994.
“Precipitation-Frequency Atlas of the United States” NOAA Atlas 14, Volume 2, Version 3.0, G.
M. Bonnin, D. Martin, B. Lin, T. Parzybok, M. Yekta, and D. Riley, NOAA, National
Weather Service, Silver Spring, Maryland, 2006. https://hdsc.nws.noaa.gov/hdsc/pfds/
United States Army Corps of Engineers. “Hydrologic Modeling System (HEC-HMS).”
https://www.hec.usace.army.mil/software/hec-hms/
I-34

Appendix I Acceptable Hydrologic Methods and Models
United States Department of Agriculture Natural Resources Conservation Service. “WinTR-55.”
https://www.nrcs.usda.gov/wps/portal/nrcs/detailfull/national/water/?cid=stelprdb1042901
United States Department of Agriculture Natural Resources Conservation Service. “WinTR-20.”
http://go.usa.gov/cZeg9
United States Department of Agriculture Natural Resources Conservation Service Urban
Hydrology for Small Watersheds TR-55. June 1986.
U.S. Environmental Protection Agency. “Storm Water Management Model (SWMM).”
https://www.epa.gov/water-research/storm-water-management-model-swmm
Virginia Department of Conservation and Recreation DRAFT 2009 Virginia Stormwater
Management Handbook. September 2009.
I-35