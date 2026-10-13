# Appendix A Compliance Calcs

**Source:** `docs/DOEE Stormwater Management Guidebook January 2020.pdf`  
**Pages:** 377–416 (PDF page numbers)  
**Parent document:** DOEE Stormwater Management Guidebook (January 2020)

---

Appendix A Compliance Calculations and Design
Examples
A.1 Stormwater Database and General Retention Compliance
Each regulated project must use the Stormwater Database for Stormwater Management Plan
(SWMP) submittal to DOEE to demonstrate proper stormwater best management practice (BMP)
selection and sizing to achieve the required volume of stormwater retention and/or water quality
treatment. Online submittal through the Stormwater Database is required. While the Stormwater
Database is used to provide site and plan information for SWMPs, Soil Erosion and Sediment
Control Plans, Green Area Ratio (GAR) plans, and allow participation in the Stormwater
Retention Credit (SRC) trading and RiverSmart Rewards discount program, this appendix only
discusses SWMP submittal.
The Required Plan Compliance Sheet from the database must be included as part of the SWMP.
All major regulated projects are required to address the Stormwater Retention Volume (SWRv),
and major regulated projects in the Anacostia Waterfront Development Zone (AWDZ) are
required to address the Water Quality Treatment Volume (WQTv), as described in Chapter 2,
“Minimum Control Requirements.” The Stormwater Database can also be used, in addition to
other hydrologic methods and models, to demonstrate compliance with detention obligations (see
Section 2.6, “Control of 2-Year Storm,” Section 2.7, “Control of 15-Year Storm,” and Appendix
I -  - Acceptable Hydrologic Methods and Models.
This appendix discusses concepts and equations related to the Required Plan Compliance Sheets
and provides several SWMP design examples.
Full instructions for the use of the Stormwater Database can be found at http://doee.dc.gov/swdb
.
DOEE also provides a General Retention Compliance Calculator (GRCC) spreadsheet which can
be used as both a learning and design tool for project engineers. The GRCC is an Excel file
located on the DOEE website at https://doee.dc.gov/swguidebook. Instructions for using the
spreadsheet can be found there as well.
A.2 Compliance Calculations and Concepts
The following guidance explains calculations and concepts related to demonstrating compliance
with DOEE’s stormwater management requirements. Many of these calculations and concepts
are used on the Required Plan Compliance Sheets from the Stormwater Database. Several
calculations are conducted internally in the Stormwater Database based on plan information
entered into a project’s database record.
A-1

Appendix A Compliance Calculations and Design Examples
Site Drainage Area Compliance Data
1. Regulatory Activities: As described in Section 2.2, “Regulated Site Definition and
Examples,” major land disturbing activities and major substantial improvement activities will
trigger the stormwater management requirements. Further descriptions of these activities can
be found in that section.
2. Site Drainage Area Tabulation: Each site must be divided into individual site drainage areas
(SDAs). Each SDA drains stormwater from the site to a single discharge point or sheet flows
from a single area off the site. All area within a project’s Limit of Disturbance (LOD) must
be counted in a SDA, along with the footprint of buildings or structures which are designated
as major substantial improvement activities.
3. Site Drainage Area Land Cover: SDAs track the amount of pre-project and post-project land
cover. Guidance for various land covers is provided in Appendix O - Land Cover
Designations. Note: Counting the post-project land cover will be iterative as BMP sizing is
performed and the area of both BMPs and other land cover types are adjusted. Vehicular
access areas should be identified only if the site is in the MS4. Vehicular access areas are a
sub-category of impervious cover; therefore, they must be included as a part of the total
impervious cover area. The post-project land cover is used to determine the SWRv and
WQTv (if applicable) as described in Table 2-1. The SWRv of each SDA is summed and
used to determine the project’s retention requirement.
4. Public Right-of-Way SDAs and the Maximum Extent Practicable Process: SDAs in the
public right-of-way (PROW) must be tabulated, and their SWRv summed, separately from
SDAs not in the PROW. If the SWRv or WQTv is not met for a SDA in the PROW, the site
may still comply if it follows the maximum extent practicable (MEP) process as described in
Appendix B - Maximum Extent Practicable Process for Existing Public Right-of-Way.
5. Vehicular Access Area Required Volume: As noted in Section 2.3 Stormwater Retention
Volume, for all vehicular access areas in the MS4, a minimum of 50% of the SWRv must
also be retained or treated. This volume is calculated for each SDA as follows:
𝑉 = 𝑃 × 𝑅𝑣𝐼 × 𝐴𝑣 × 0.5
where:
V = volume within the SDA from vehicular access areas that must be retained or
treated (ft3)
P = regulatory rain event for SWRv (in.)
RvI = runoff coefficient for impervious cover (0.95)
Av = area of vehicular access area (ft2)
12 = conversion factor, converting inches to feet
6. Site Drainage Area Location Data: SDAs are assigned location designations depending on
which sewershed it drains to: the Municipal Separated Stormwater Sewer System (MS4), the
A-2

Appendix A Compliance Calculations and Design Examples
Combined Sewer System (CSS) where combined sewer overflows (CSOs) will be reduced
with green infrastructure, or the CSS from a sewershed where CSOs will be reduced with
storage tunnels. Section 2.3, “Stormwater Retention Volume” describes how SWRv can be
achieved depending on the sewershed location of the site.
Best Management Practice (BMP) Compliance Data
1. BMP Tabulation and Land Cover: Proposed stormwater BMPs are assigned to the SDA
where the BMP is located. Land cover area within the BMP’s contributing drainage area
(CDA) is tabulated the same as for a SDA.
2. Maximum Retention Volume Received by the BMP, Vmax: The maximum retention volume
received by the BMP (Vmax) represents the greatest retention volume for which a BMP can be
credited. Regardless of the regulatory rainfall event that applies to the site, the volume
calculated is based on a rainfall depth of 1.7 inches.
𝑉𝑚𝑎𝑥 = 1.7 × [(𝑅𝑣𝑁 × 𝑁) + (𝑅𝑣𝐶 × 𝐶) + (𝑅𝑣𝐼 × (𝐼 + 𝐴𝐵𝑀𝑃))]
where:
Vmax = volume received by the BMP from 1.7-inch rain event (ft3)
RvN = runoff coefficient for natural cover (0.00)
N = area of post-development natural cover (ft2)
RvC = runoff coefficient for compacted cover (0.25)
C = area of post-development compacted cover (ft2)
RvI = runoff coefficient for impervious cover (0.95)
I = area of post-development impervious cover (ft2)
ABMP = area of BMP (ft2)
12 = conversion factor, converting inches to feet
3. BMP Storage Volume: This value refers to the total volume that can be retained by the BMP,
determined using the related BMP storage volume calculations found in Chapter 3. This
value is not necessarily the amount of volume which will receive retention credit.
4. BMP Retention Value: Depending on the category and sub-category of the BMP, a modifier
value is applied to the BMP storage volume. For example, standard bioretention practices are
assigned a retention value of 0.6.
5. Volume Retained: The stormwater volume that is credited for retention. This value is the
lesser of Vmax or the BMP storage volume multiplied by the BMP retention value.
6. BMP Treatment Volume: BMPs that have a less than 100% retention value and are accepted
TSS treatment practices are assigned additional treatment volume. This volume is based upon
the lesser of the runoff volume received by the BMP and the actual storage volume minus the
volume retained.
A-3

Appendix A Compliance Calculations and Design Examples
7. Downstream BMPs and Treatment Trains: If more than one BMP is employed in series, any
overflow volume from the 1.7-inch storm from upstream BMPs can be directed to a
downstream BMP and applied to the downstream BMP’s volume retained if any storage
volume remains.
Detention Calculations and Concepts
Detention requirements are discussed in Section 2.6, “Control of 2-Year Storm” and Section 2.7,
“Control of 15-Year Storm.” DOEE accepts the Adjusted Curve Number method for determining
compliance with detention requirements, which takes into account the detention benefits of
retention BMPs during storm events. The Stormwater Database automatically calculates these
adjusted curve numbers for the 2-year, 15-year, and 100-year storms according to the storage
BMPs proposed for a project. The procedure for performing these calculations is provided
below:
1. Calculate a Weighted Curve Number for both pre-project and post-project conditions. Each
land cover type is associated with a Natural Resource Conservation Service (NRCS) curve
number (CN). Additional information on the NRCS CN method can be found in Appendix I -
Acceptable Hydrologic Methods and Models.
Weighted Curve Number
𝐶𝑁 =
(𝑁 × 70) + (𝐶 × 74) + (𝐼 × 98)
𝑆𝐴
where:
CN = weighted curve number
N = area of natural cover (ft2)
C = area of compacted cover (ft2)
I = area of impervious cover (ft2)
SA = total site area (ft2)
2. Calculate the runoff without regard to BMPs.
Potential Abstraction
𝑆 = 1000
𝐶𝑁 − 10
where:
S = potential abstraction (in.)
CN = weighted curve number
A-4

Appendix A Compliance Calculations and Design Examples
Runoff with no Retention
𝑄 = (𝑃 − 0.2 × 𝑆)2
(𝑃 + 0.8 × 𝑆)
where:
Q = runoff with no BMPs (in.)
P = precipitation depth for a given 24-hour storm (in.)
 = 2-year storm (3.14 inches)
 = 15-year storm (5.23 inches)
 = 100-year storm (8.34 inches)
S = potential abstraction (in.)
3. Calculate the runoff with BMPs. This value is the runoff without BMPs minus the total
storage volume provided by BMPs.
Runoff with BMPs
𝑄𝐵𝑀𝑃 = 𝑄 − 𝑆𝑣𝐷𝐴 × 12
𝑆𝐴
where:
QBMP = runoff with BMPs (in.)
Q = runoff with no BMPs (in.)
SvDA = total storage volume provided by BMPs for the site area (ft3)
12 = unit adjustment factor, feet to inches
SA = total site area (ft2)
4. The Adjusted Curve Number is the CN that results in the calculated runoff with the BMPs.
This Adjusted Curve Number can be determined by a table lookup. The user finds the
corresponding CN that results in QBMP runoff calculated in Step 3. The lookup table to
determine the Adjusted Curve Number is provided in the GRCC. The table can also be user-
generated in a spreadsheet program such as Excel.
A-5

Appendix A Compliance Calculations and Design Examples
Adjusted Curve Number
(𝑃 − 0.2 × 𝑆𝑎𝑑𝑗𝑢𝑠𝑡𝑒𝑑)2
(𝑃 + 0.8 × 𝑆𝑎𝑑𝑗𝑢𝑠𝑡𝑒𝑑) =  𝑄𝐵𝑀𝑃  →  𝑙𝑜𝑜𝑘𝑢𝑝 𝑡𝑎𝑏𝑙𝑒 → 𝐶𝑁𝑎𝑑𝑗𝑢𝑠𝑡𝑒𝑑
𝑆𝑎𝑑𝑗𝑢𝑠𝑡𝑒𝑑 = 1000
𝐶𝑁𝑎𝑑𝑗𝑢𝑠𝑡𝑒𝑑
− 10
where:
CNadjusted = adjusted curve number that will create a runoff equal to the site
area runoff including BMPs
P = precipitation depth for a given 24-hour storm (in.)
 = 2-year storm (3.14 inches)
 = 15-year storm (5.23 inches)
 = 100-year storm (8.34 inches)
Sadjusted = adjusted potential abstraction based upon adjusted curve number
(in.)
QBMP = runoff with BMPs (in.)
5. If the Adjusted Curve Number for the entire project for the 2-year storm event is less than or
equal to pre-development conditions, then the 2-year detention requirement is met. If the
Adjusted Curve Number for the entire project for the 15-year storm event is less than or
equal to the pre-project Adjusted Curve Number, then the 15-year detention requirement is
met.
6. If the Adjusted Curve Number is not less than its comparison CN, then additional storage is
required. A project must demonstrate meeting detention requirements using an acceptable
method from Appendix I - Acceptable Hydrologic Methods and Models.
A-6

Appendix A Compliance Calculations and Design Examples
A.3 Design Examples
Design Example 1
Step 1: Determine Design Criteria.
Site Name Anacostia Offices
Total Site Area 40,000 ft2
Natural Cover Area 8,000 ft2
Compacted Cover 2,000 ft2
Impervious Cover 30,000 ft2
Vehicular Access Areas 10,000 ft2
Is site located within the AWDZ? No
Is site located within the MS4? Yes
What type of activity is site undergoing? Major Land-Disturbing
Step 2: Determine the Retention and Treatment Requirements.
Based on the design criteria above, Anacostia Offices has the following requirements:
Rooftop
20,000 sf
Natural Cover 8,000 sf
128'
32'
156.25'
250'
Driveway
2,000 sf
Parking
8,000 sf
40'53.75'
50'
50'
28'
Lawn
2,000 sf
A-7

Appendix A Compliance Calculations and Design Examples
𝑆𝑊𝑅𝑣 = 2,900 ft3
Step 3: Identify Site Constraints and BMP Restrictions.
Key considerations for Anacostia Offices include the following:
 Site soils are contaminated, so infiltration is not allowed, and impermeable liners will be
required for most BMPs.
 The commercial land use means that most BMPs are otherwise acceptable.
Step 4: Select BMPs to Meet the Retention and Treatment Requirements.
While there are numerous options for treatment of this site, two BMPs were selected: rainwater
harvesting (R-1) for the rooftop and traditional bioretention (B-1) for any remaining rooftop
runoff and the rest of the site. Since the site is contaminated, a liner is required and the enhanced
bioretention option is not available.
The site will ultimately have one outlet point, and the selected treatment train is relatively
simple, so the calculations can be performed with one SDA.
The first BMP selected is rainwater harvesting for runoff from the rooftop. The Rainwater
Harvesting Retention Calculator should be used to determine the cistern size and the associated
retention value. In the Rainwater Harvesting Retention Calculator, input 20,000 square feet as
the CDA. For utilization of the rainwater, flushing toilets/urinals is selected as the use, and the
appropriate values are entered. In this case, 475 people will use the building per day, Monday
through Friday, 8 hours per day. On the Storage Volume Results sheet, the Available Storage
Volume (Sv) is given for various tank sizes. The tables and graphs show that a 30,000-gallon
underground tank (or series of tanks) would have an available storage volume of 2,501 cubic
feet.
The BMP is assigned to SDA 1 with a 20,000-square-foot CDA and a storage volume of 2,501
cubic feet. The result is that 2,501 cubic feet of runoff is retained and 191 cubic feet remain.
Since Standard Bioretention will be the next BMP in the series, the remaining runoff volume will
then be directed to this BMP.
In addition to the overflow from the rainwater harvesting BMP, the bioretention area will receive
runoff from the rest of the site. Through trial and error, it was determined that a 1,000-square-
foot bioretention area would be sufficient to meet the retention requirement. This area will be
taken from the compacted cover area and replaced by BMP cover. Compacted cover will now be
1,000 square feet, and BMP will be 1,000 square feet. The 8,000 square feet of natural cover will
remain. Impervious cover directed to the bioretention area will be 10,000 square feet (the
remaining impervious area after 20,000 square feet was removed for rainwater harvesting). There
will also be 1,000 square feet of compacted cover and 1,000 square feet of BMP surface area
directed to the bioretention area. Since the 10,000 square feet of impervious cover is made up of
driveway and parking area, it is all classified as vehicular access area.
The vehicular access retention/treatment requirement is 475 cubic feet, and the total volume
directed to the bioretention area, including the “overflow” from the rainwater harvesting BMP,
A-8

Appendix A Compliance Calculations and Design Examples
will be 1,707 cubic feet. The bioretention storage volume of 800 cubic feet is more than
sufficient to address the vehicular access volume and leads to an exceedance of 82 gallons for the
SWRv.
Step 5: Size the BMPs According to the Design Equations.
The size of the rainwater-harvesting cistern was already determined to be 30,000 gallons,
although additional volume may be necessary for dead storage for a pump and/or freeboard.
To meet the bioretention criteria, the bioretention area is sized with 1.5 feet of filter media, 0.75
feet of gravel, and a 0.5-foot ponding depth. The bioretention cell sizing goal is 800 cubic feet.
Step 5.1: Check the Filter Media Depth.
Ensure that the filter media depth does not exceed the maximum in Table 3-19. The ratio of the
surface area of the BMP (1,000 ft2) to the CDA (32,000 ft2) is 3.1%. The Rv for the CDA to the
bioretention practice is 0.93. The maximum filter media depth allowed is 5.4 feet. As the
bioretention was sized with 1.5 feet of filter media, it passes this check.
Table 3.20 Determining Maximum Filter Media Depth (feet)
SA:CDA
(%)
RvCDA
0.25 0.3 0.40 0.50 0.60 0.70 0.80 0.90 0.95
0.5 6.5 6.5 6.5 6.5 6.5 6.5 6.5 6.5 6.5
1.0 5.0 5.5 6.0 6.5 6.5 6.5 6.5 6.5 6.5
1.5 3.5 4.0 5.0 6.0 6.0 6.5 6.5 6.5 6.5
2.0  3.0 4.0 4.5 5.5 6.0 6.0 6.5 6.5
2.5   3.5 4.0 4.5 5.0 5.5 6.0 6.0
3.0    3.5 4.0 4.5 5.0 5.5 5.5
3.5    3.0 3.5 4.0 4.5 5.0 5.0
4.0     3.0 3.5 4.0 4.5 4.5
4.5      3.5 3.5 4.0 4.0
5.0       3.5 4.0 4.0
5.5        3.5 3.5
6.0        3.0 3.5
6.5         3.0
7.0+
A-9

Appendix A Compliance Calculations and Design Examples
Step 5.2: Determine Storage Volume.
Equation 3.5
𝑆𝑣 = 𝑆𝐴𝑏𝑜𝑡𝑡𝑜𝑚 × �(𝑑𝑚𝑒𝑑𝑖𝑎 × 𝜂𝑚𝑒𝑑𝑖𝑎) + �𝑑𝑔𝑟𝑎𝑣𝑒𝑙 × 𝜂𝑔𝑟𝑎𝑣𝑒𝑙��+ (𝑆𝐴𝑎𝑣𝑒𝑟𝑎𝑔𝑒 × 𝑑𝑝𝑜𝑛𝑑𝑖𝑛𝑔)
where:
Sv = total storage volume of bioretention (ft3)
SAbottom = bottom surface area of bioretention (ft2)
dmedia = depth of the filter media, including mulch layer (ft)
ηmedia = effective porosity of the filter media (typically 0.25)
dgravel = depth of the underdrain and underground storage gravel layer,
including choker stone (ft)
ηgravel = effective porosity of the gravel layer (typically 0.4)
SAaverage = average surface area of the bioretention (ft2)
typically, where SAtop is the top surface area of bioretention,
dponding = maximum ponding depth of the bioretention (ft)
Solving Equation 3.5 often requires an iterative approach to determine the most appropriate
bottom surface area and average surface area to achieve the desired Sv. In this case, a
bioretention with a 40-foot by 25-foot top area and 3H:1V side slopes will provide an SA
top of
1,000 square feet, an SAbottom of 814 square feet, an SAaverage of 907 square feet, and achieve an
Sv of 1,003 cubic feet. This more than meets the goal of 800 cubic feet. If desired, the surface
area of the practice could be reduced accordingly, or more SRCs could be generated with the
excess volume.
topbottom
average
SASASA +=
A-10

Appendix A Compliance Calculations and Design Examples
Step 6: Check Design Assumptions and Requirements.
Key assumptions and requirements for this site include the following:
 Based upon the above design, the rainwater harvesting cistern will be 30,000 gallons, and the
bioretention cell will require at least 1,000 square feet of surface area. The designer would
need to ensure that space would be available for these BMPs on the site.
 The CDA for traditional bioretention must be 2.5 acres or less and this site is less than 1 acre.
 The required head for the above design will be 3.5 feet, including ponding depth (9 inches),
mulch (3 inches), filter media (18 inches), choking layer (3 inches), and gravel layer (9
inches; see Figure 3.16). The outlet for the underdrain must be at least this deep.
 The water table must be at least 2 feet below the underdrain, or 5.5 feet below the surface.
According to the Soil Survey, Beltsville soils have a 1.5- to 2-foot depth to groundwater
table, Croom soils have greater than a 5-foot depth, and Sassafras soils have a 4-foot depth.
On-site soil investigations will be needed to determine if the 5.5-foot depth to the
groundwater table can be met on this site.
 Due to soil contamination and the bioretention area’s proximity to the building (less than 10
feet), an impermeable liner is required.
Since all of these assumptions and requirements can be met in this design example (pending
groundwater table investigations), this step is complete.
Bioretention Top
Surface Area 1,000 sf
Lawn 1,000 sf 25'
Rooftop
20,000 sf
Natural Cover 8,000 sf
128'
32'
156.25'
Driveway
2,000 sf
Parking
8,000 sf
40'53.75'
50'
40'
28'
A-11

Appendix A Compliance Calculations and Design Examples
Step 7: Use the Adjusted Curve Number to Address Peak Flow Requirements.
The original site CN of 92 is reduced for the 2-year, 15-year, and 100-year storms to 79, 82, and
83, respectively, by the storage provided by the cistern and bioretention cell. These values can be
used to help determine detention requirements for this site.
Step 8: Determine Detention Requirements.
Detention is required to reduce the peak discharge rate from the 2-year storm event to the
predevelopment (meadow conditions or better) peak discharge rate and to reduce the peak
discharge rate from the 15-year storm event to the pre-project peak discharge rate. Appendix I -
- Acceptable Hydrologic Methods and Models includes details on how to calculate the detention
volume. In this example, the proposed impervious cover and the proposed runoff CN are less
than the pre-project conditions, so detention for the 15-year storm is not required. Detention for
the 2-year storm will be required.
The peak inflow (
qi2) and the peak outflow (qo2) can be calculated using the WinTR-55 Small
Watershed Hydrology program, the area of the site, the time of concentration (Tc, assumed to be
10 minutes), and the CNs. The reduced CN of 79, determined above, generates a qi2 of 1.61
cubic feet per second (cfs). The CN for meadow in good condition, 71, generates a qo2 of 1.07
cfs.
The ratio of 1.07 cfs to 1.61 cfs equals 0.66. Using Figure H.1, the ratio of storage volume (Vs2)
to runoff volume (Vr2) is 0.22.
A-12

Appendix A Compliance Calculations and Design Examples
Figure A.1 Approximate detention basin routing for rainfall types I, IA, II and III.
The runoff with BMPs is 1.34 inches (QBMP), which equates to 4,358 cubic feet (Vr2). Using the
calculated ratio of Vs2/Vr2, the storage volume required for the site (Vs2) is 959 cubic feet.
With appropriate orifice design to ensure that outflows are properly restricted, this detention
volume can be incorporated below the proposed bioretention area or located elsewhere on the
site as a standalone detention practice.
A-13

Appendix A Compliance Calculations and Design Examples
Design Example 2
Step 1: Determine Design Criteria.
Design Example 2 includes the following proposed design criteria:
Site Name Downtown Multi-Story Renovation
Total Site Area 15,000 ft2
Natural Cover Area 0 ft2
Compacted Cover 0 ft2
Impervious Cover (Rooftop) 15,000 ft2
Vehicular Access Areas 0 ft2
Is site located within the AWDZ? No
Is site located within the MS4? Yes
What type of activity is the site
undergoing? Major Substantial Improvement
Step 2: Input Design Criteria to Determine the Retention and Treatment Requirements.
Based on the design criteria above, the Multi-Story Renovation project is required to treat 0.8
inches of rainfall for the SWRv:
𝑆𝑊𝑅𝑣 = 950 ft3
Step 3: Identify Site Constraints and BMP Restrictions.
Key considerations for the Multi-Story Renovation project include the following:
 Since this is a rooftop-only site, very few treatment options are available.
 As a renovation, the structure of the existing roof will be a factor for any rooftop practice.
Step 4: Select BMPs to Meet the Retention and Treatment Requirements.
As an initial estimate, 75% of the rooftop is proposed to be converted to a green roof, with the
remaining 25% draining to it. Therefore, the land use values need to be changed to account for
the green roof: 3,750 square feet as impervious cover and 11,250 square feet as BMP. There will
be only one SDA for the site. The goal of this design is to capture the entire retention volume
(950 ft
3) in the green roof.
Step 5: Size the BMPs According to the Design Equations.
The green roof needs to be sized according to Equation 3.1. Since green roofs are typically
manufactured systems, several of the parameters, such as the drainage layer depth and maximum
water retention of all layers, need to be provided by the manufacturer. The values for the roof
used in this design are provided in the variable descriptions below Equation 3.1 (with each layer
illustrated in Figure 3.1).
A-14

Appendix A Compliance Calculations and Design Examples
Equation 3.1 Storage Volume for Green Roofs
𝑆𝑣 = 𝑆𝐴 × [(𝑑 × 𝑀𝑊𝑅1) + (𝐷𝐿 × 𝑀𝑊𝑅)]
where:
Sv = storage volume (ft3) (goal is 950 ft3)
SA = green roof area (ft2) (need to determine)
d = media depth (in.) (6 in.)
𝑀𝑊𝑅1 = verified media maximum water retention (0.25)
DL = drainage layer depth (in.) (1 in.)
𝑀𝑊𝑅2 = verified drainage layer maximum water retention (0.4)
Figure 3.1 Typical layers for a green roof.
Rearranging Equation 3.1 finds the minimum required surface area:
 𝑆𝐴 = 𝑆𝑣 × 12
[(𝑑 × 𝑀𝑊𝑅1) + (𝐷𝐿 × 𝑀𝑊𝑅2)]
or:
𝑆𝐴 = 950
[(6 × 0.25) + (1 × 0.4)] × 12 = 6,000 ft2
A-15

Appendix A Compliance Calculations and Design Examples
Therefore, the green roof must be sized to be at least 6,000 square feet, given the proposed
depths. The original assumption was that an 11,250-square-foot roof would be used. Since a
smaller roof is feasible, the drainage areas in the spreadsheet may be revised accordingly.
Note: If the CDA to the green roof is increased beyond the area of the green roof itself, design
details will need to be provided that show how runoff from the additional CDA will be
sufficiently distributed over the green roof. The absolute maximum CDA to the green roof shall
be no more than 100% larger than the area of the green roof. Alternatively, a larger green roof
may be utilized, and the increased storage volume can be used to reduce peak flow volume
requirements (see Step 8) or sold as SRCs.
Step 6: Check Design Assumptions and Requirements.
Key assumptions and requirements for this site include the following:
 A structural analysis of the building is needed to determine that the green roof can be
supported by the existing structure.
 Ensure that there is sufficient space on the rooftop (allowing for structures such as vents,
steep areas of the roof, and other panels). In this case, the minimum roof area of 6,000 square
feet is less than half of the entire roof area, and most roofs can accommodate this area.
 At least 1,500 square feet of the rooftop not covered by green roof needs to be designed so
that it drains to the green roof without damaging it.
Since all of these assumptions and requirements can be met in this design example, this step is
complete.
Design Example 3
Step 1: Determine Design Criteria.
Design Example 3 includes the following proposed design criteria:
Site Name Ward 5 Low-Rise Commercial
Total Site Area 25,000 ft2
Natural Cover Area 0 ft2
Compacted Cover 5,000 ft2
Impervious Cover 20,000 ft2
Vehicular Access Areas 10,000 ft2
Is site located in the AWDZ? No
Is site located within the MS4? Yes
What type of activity is site undergoing? Major Land-Disturbing
A-16

Appendix A Compliance Calculations and Design Examples
Step 2: Input Design Criteria to Determine the Retention and Treatment Requirements.
Based on the design criteria above, the project has the following requirement:
𝑆𝑊𝑅𝑣 = 2,025 ft3
Step 3: Identify Site Constraints and BMP Restrictions.
Key considerations for the project include the following:
 Only a small portion of the compacted cover is available for potential BMPs.
 The Multi-Family Residential site is not restrictive of BMP options.
 The relatively permeable Sunnyside-Sassafras-Muirkirk-Christiana soils on this site allow for
infiltration into site soils.
Step 4: Select BMPs to Meet the Retention and Treatment Requirements.
An enhanced bioretention with no underdrain is chosen for this site, primarily to minimize cost.
Several other options, such as permeable pavers, would have been acceptable at this site.
The site will ultimately have one outlet point, with only one BMP, so there is only one SDA.
Rooftop
10,000 sf
Parking
10,000 sf
Lawn 5,000 sf
78.125'
78.125'
128'32'
156.25'
160'
A-17

Appendix A Compliance Calculations and Design Examples
It is assumed that the entire site will be directed to the bioretention area. However, the surface
area of the bioretention area must be accounted for. It was determined that only 1,000 square feet
of compacted cover would be available for a bioretention area. Compacted cover will now be
4,000 square feet, and BMP area will be 1,000 square feet. The rooftop and parking areas will
not change. This approach will lead to a total volume of 2,968 cubic feet directed to the BMP.
Since enhanced bioretention receives 100% retention value, the required storage volume to meet
the SWRv is 2,095 cubic feet. This is the required SWRv after changes in land use were made to
account for the bioretention surface area. However, the 1,000 square feet available will not be
sufficient to provide the entire required storage volume. Through trial and error (see Step 5
below) it was determined that the maximum storage volume is 1,301 cubic feet. While this
stormwater management plan achieves at least 50% on-site retention, it does not achieve 100%;
there is still 794 cubic feet, or 5,939 gallons remaining. This volume will have to be met through
the purchase or generation of SRCs (see Chapter 7, “Generation, Certification, Trading, and
Retirement of Stormwater Retention Credits” and Step 9 below).
Step 5: Size the BMPs According to the Design Equations.
Assume a filter media depth of 2 feet, a gravel depth of 0.75 feet, and a ponding depth of 1 foot.
Step 5.1: Check the Filter Media Depth.
Ensure that the filter media depth does not exceed the maximum in Table 3.20. The ratio of the
surface area of the bioretention (1,000 ft2) to the CDA (25,000 ft2) is 4%. The Rv was previously
determined to be 0.84. The maximum filter media depth allowed is 4.0 feet. As the bioretention
was sized with 2 feet of filter media, it passes this check.
Table 3.20 Determining Maximum Filter Media Depth (feet)
SA:CDA
(%)
RvCDA
0.25 0.3 0.40 0.50 0.60 0.70 0.80 0.90 0.95
0.5 6.5 6.5 6.5 6.5 6.5 6.5 6.5 6.5 6.5
1.0 5.0 5.5 6.0 6.5 6.5 6.5 6.5 6.5 6.5
1.5 3.5 4.0 5.0 6.0 6.0 6.5 6.5 6.5 6.5
2.0  3.0 4.0 4.5 5.5 6.0 6.0 6.5 6.5
2.5   3.5 4.0 4.5 5.0 5.5 6.0 6.0
3.0    3.5 4.0 4.5 5.0 5.5 5.5
3.5     3.5 4.0 4.5 5.0 5.0
4.0     3.0 3.5 4.0 4.5 4.5
4.5      3.5 3.5 4.0 4.0
5.0       3.5 4.0 4.0
5.5        3.5 3.5
6.0        3.0 3.5
6.5         3.0
7.0+
A-18

Appendix A Compliance Calculations and Design Examples
Step 5.2: Determine the Storage Volume.
Equation 3.5
𝑆𝑣 = 𝑆𝐴𝑏𝑜𝑡𝑡𝑜𝑚 × �(𝑑𝑚𝑒𝑑𝑖𝑎 × 𝜂𝑚𝑒𝑑𝑖𝑎) + �𝑑𝑔𝑟𝑎𝑣𝑒𝑙 × 𝜂𝑔𝑟𝑎𝑣𝑒𝑙��+ (𝑆𝐴𝑎𝑣𝑒𝑟𝑎𝑔𝑒 × 𝑑𝑝𝑜𝑛𝑑𝑖𝑛𝑔)
where:
Sv = total storage volume of bioretention (ft3)
SAbottom = bottom surface area of bioretention (ft2)
dmedia = depth of the filter media, including mulch layer (ft)
ηmedia = effective porosity of the filter media (typically 0.25)
dgravel = depth of the underdrain and underground storage gravel layer,
including choker stone (ft)
ηgravel = effective porosity of the gravel layer (typically 0.4)
SAaverage = average surface area of the bioretention (ft2)
typically, where SAtop is the top surface area of bioretention,
𝑆𝐴𝑎𝑣𝑒𝑟𝑎𝑔𝑒 =
𝑆𝐴𝑏𝑜𝑡𝑡𝑜𝑚+𝑆𝐴𝑡𝑜𝑝
dponding = maximum ponding depth of the bioretention (ft)
Solving Equation 3.5 often requires an iterative approach to determine the most appropriate
bottom surface area and average surface area to achieve the desired Sv. In this case, a long,
narrow practice with a 50- by 20-foot top area and 3H:1V side slopes was all that would fit on
the site. This configuration will provide an SA
top of 1,000 square feet, an SAbottom of 616 square
feet, an SAaverage of 808 square feet, and will achieve an Sv of 1,301 cubic feet.
A-19

Appendix A Compliance Calculations and Design Examples
Step 6: Check Design Assumptions and Requirements.
Key assumptions and requirements for this site include the following:
 The design will need at least 1,000 square feet of surface area. The designer would need to
ensure that this area is available.
 The CDA for traditional bioretention must be 2.5 acres or less, and this site has a total
drainage area of less than 0.5 acres.
 Vehicular access areas must be addressed. The vehicular access retention/treatment
requirement of 475 cubic feet is met by this design.
 Head requirements are not likely to be an issue since this is an infiltration design.
 The water table must be at least 2 feet below the bottom of the bioretention, or 4.25 feet
below the surface.
 In order to infiltrate the 1,301-cubic-foot storage volume, the saturated hydraulic
conductivity must be at least 0.36 inches per hour.
 Additional SRCs will need to be generated or purchased off-site.
Since all of these assumptions and requirements can be met (pending groundwater table and
infiltration rate investigations) in this design example, this step is complete.
Rooftop
10,000 sf
Parking
10,000 sf
78.125'
78.125'
128'32'
Lawn 4,000 sf
50'
20' Bioretention
Surface Area 1,000 sf
A-20

Appendix A Compliance Calculations and Design Examples
Step 7: Use the Adjusted Curve Number to Address Peak Flow Requirements.
The original site CN of 92 is reduced for the 2-year, 15-year, and 100-year storms to 85, 86, and
87, respectively, by the retention provided by the bioretention cell. These CNs can be used to
help determine detention requirements for this site.
Step 8: Determine the Detention Requirements.
Detention is required to reduce the peak discharge rate from the 2-year storm event to the
predevelopment (meadow conditions or better) peak discharge rate and to reduce the peak
discharge rate from the 15-year storm event to the pre-project peak discharge rate. Appendix I -
- Acceptable Hydrologic Methods and Models includes details on how to calculate the detention
volume. In this example, the proposed impervious cover and the proposed runoff CN is less than
the pre-project conditions, so detention for the 15-year storm is not required. Detention for the 2-
year storm will be required.
The peak inflow (
qi2) and the peak outflow (qo2) can be calculated using the WinTR-55 Small
Watershed Hydrology program, the area of the site, the time of concentration (Tc, assumed to be
10 minutes), and the CNs. The reduced CN of 87, determined above, generates a qi2 of 1.85 cfs.
The CN for meadow in good condition, 58, generates a qo2 of 0.18 cfs.
The ratio of 0.18 cfs to 1.85 cfs equals 0.10. Using Figure H.1, the ratio of storage volume (Vs2)
to runoff volume (Vr2) is 0.55.
The runoff with BMPs is 1.73 inches (QBMP), which equates to 3,604 cubic feet (Vr2). Using the
calculated ratio of Vs2/Vr2, the storage volume required for the site (Vs2) is 1,982 cubic feet.
This detention volume, with appropriate orifice design to ensure that outflows are properly
restricted, can be incorporated below the proposed bioretention area or located elsewhere on the
site, such as underneath the parking lot as a standalone detention practice.
Step 9: Identify Stormwater Retention Credits.
Since the SWRv was short of the requirement by 5,939 gallons, 5,939 SRCs will need to be
purchased or generated annually for this site to achieve compliance (see Chapter 7, “Generation,
Certification, Trading, and Retirement of Stormwater Retention Credits” for more details and
example calculations).
Design Example 4
Design Example 4 includes the following proposed design criteria:
Site Name Green St. and Gold St. Intersection
Total Site Area 13,528 ft2
Natural Cover Area 0 ft2
Compacted Cover 185 ft2
Impervious Cover 13,343 ft2
A-21

Appendix A Compliance Calculations and Design Examples
The site in this design example is a street reconstruction project. Since it is located in the PROW,
the MEP design process applies (see Appendix B - Maximum Extent Practicable Process for
Existing Public Right-of-Way).
Step 1: Calculate SWRv.
This intersection includes four stormwater inlets (one at each corner), so it will be divided into
four SDAs. The DDOT Maximum Extent Practicable Design Worksheet requires calculation of
the CDA within the limits of disturbance (LOD) as well as calculation of the CDA outside the
LOD.
Site Drainage
Area
(SDA 1 - N)
CDA
(ft2)
SWRv
(gal)
within
LOD
outside
LOD
within
LOD
outside
LOD
SDA 1 3,473 1,138 2,371 809
SDA 2 2,937 987 2,087 701
SDA 3 5,285 1,747 3,756 1,241
SDA 4 1,833 1,931 1,303 1,372
SDA TOTAL 13,528 5,803 9,517 4,123
All of the drainage areas were 100% impervious, except for SDA 1, which included 185 square
feet of landscaped area within the LOD.
Step 2: Consider Infiltration.
This step requires looking at infiltration options by identifying constraints to infiltration, such as
a high water table, soil contamination, or poor infiltration rates, and locating areas that are well
suited for infiltration.
In this example, a high water table and soil contamination were not a concern. The soil had only
a moderate to low infiltration rate, making an infiltration sump a possibility as part of another
BMP (such as enhanced bioretention) but not feasible as a standalone BMP.
Step 3: Demonstrate Full Consideration of Land-Cover Conversions and Optimum
BMP Placement.
Opportunities for BMP placement within and adjacent to the PROW include traffic islands,
triangle parks, cul-de-sacs, paper streets, and traffic calming measures, such as median islands,
pedestrian curb extensions, bump outs, chicanes, and turning radius reductions.
As this example is a small intersection project, pedestrian curb extensions are the only feasible
location for BMP placement. BMP locations in the pedestrian curb extensions will be possible at
three of the four corners of the intersection.
A-22

Appendix A Compliance Calculations and Design Examples
Step 4: Demonstrate Full Consideration of Opportunities Within Existing
Infrastructure.
This step requires the assessment and documentation of utility locations, storm sewer depths,
right-of-way widths, and exiting trees to determine potential conflicts.
In this example, the difference in elevation between the storm sewer inlets and the invert of the
pipes is approximately 5 feet. Other utilities will constrain the space available for the proposed
BMPs but will not eliminate the pedestrian curb extension spaces entirely.
Step 5: Locate and Choose BMPs.
Although they may be undersized, enhanced bioretention areas will be selected for 3 of the 4
corners in the space available.
Areas for enhanced bioretention are as follows:
Site Drainage
Area (SDA 1 - N)
CDA within LOD
(ft2)
SWRv within LOD
(gal)
Available Area for BMP
(ft2)
SDA 1 3,473 2,371 72
SDA 2 2,937 2,087 285
SDA 3 5,285 3,756 190
SDA 4 1,833 1,303 0
SDA TOTAL 13,528 9,517 N/A
Step 6: Size BMPs.
Each bioretention area will be designed with a similar cross section: vertical side slopes for the
ponding area, a ponding depth of 0.75 feet, a filter media depth of 2 feet, and a gravel depth
(including the infiltration sump) of 1.25 feet.
The storage volume is determined with Equation 3.5
Equation 3.5
𝑆𝑣 = 𝑆𝐴
𝑏𝑜𝑡𝑡𝑜𝑚 × �(𝑑𝑚𝑒𝑑𝑖𝑎 × 𝜂𝑚𝑒𝑑𝑖𝑎) + �𝑑𝑔𝑟𝑎𝑣𝑒𝑙 × 𝜂𝑔𝑟𝑎𝑣𝑒𝑙��+ (𝑆𝐴𝑎𝑣𝑒𝑟𝑎𝑔𝑒 × 𝑑𝑝𝑜𝑛𝑑𝑖𝑛𝑔)
where:
Sv = total storage volume of bioretention (ft3)
SAbottom = bottom surface area of bioretention (ft2)
dmedia = depth of the filter media, including mulch layer (ft)
ηmedia = effective porosity of the filter media (typically 0.25)
dgravel = depth of the underdrain and underground storage gravel layer,
including choker stone (ft)
A-23

Appendix A Compliance Calculations and Design Examples
ηgravel = effective porosity of the gravel layer (typically 0.4)
SAaverage = average surface area of the bioretention (ft2)
typically, where SAtop is the top surface area of bioretention,
dponding = maximum ponding depth of the bioretention (ft)
With the cross-section dimensions provided above, Equation 3.5 yields the following results:
Site Drainage Area
(SDA 1 - N)
Available Area for BMP
(ft2)
Sv
(gal)
Sv
(ft3)
SDA 1 72 942 126
SDA 2 285 3,731 499
SDA 3 190 2,487 332
SDA 4 0 0 0
The table below indicates there is a retention deficiency for the 3 SDAs that contain proposed
BMPs.
Site Drainage
Area
(SDA 1 - N)
Regulated SWRv
within LOD
(gal)
SWRv
Achieved
(gal)
Retention
Deficiency
(gal)
Altered Drainage
Profile (Y/N)
SDA 1 2,371 942 1,429 N
SDA 2 2,087 3,731 N/A N
SDA 3 3,756 2,487 1,269 N
SDA 4 1,303 - 1,303 X
SDA TOTAL 9,517 7,160
If there is a retention volume deficiency, the MEP design process notes that the designer should
consider sizing BMPs to manage the comingled volume on site, and/or revisit Design Steps 1–6
to increase land conversion areas and BMP facilities.
In this case, the proposed bioretention areas in SDA 2 could treat additional volume, but the
proposed bioretention areas in SDA 1 and SDA 3 are at capacity. At this point, the designer
should review Steps 1 through 6 to ensure that all opportunities for land conversion and BMP
facilities have been maximized. If so, this step is complete.
Step 7: Identify Drainage Areas Where Zero-Retention BMPs are Installed.
Drainage areas that do not include retention BMPs will require installation of a water quality
catch basin to treat stormwater runoff. This requirement applies only to SDA 4 in this example.
topbottom
average
SASASA +=
A-24

Appendix A Compliance Calculations and Design Examples
Design Example 5
Step 1: Determine Design Criteria.
Design Example 5 includes the following proposed design criteria:
Site Name NoMa Office Tower
Total Site Area 65,340 ft2
Natural Cover Area 0 ft2
Compacted Cover 0 ft2
Impervious Cover (Rooftop) 65,340 ft2
Vehicular Access Areas 0 ft2
Is site located within the AWDZ? No
Is site located within the MS4? Yes
What type of activity is the site undergoing? Major Land-Disturbing
Step 2: Input Design Criteria to Determine the Retention and Treatment Requirements.
Based on the design criteria above, the NoMa Office Tower project is required to treat 1.2 inches
of rainfall for the SWRv:
𝑆𝑊𝑅𝑣 = 6,207 ft3
Step 3: Identify Site Constraints and BMP Restrictions.
The key consideration for the NoMa Office tower project is limited space. Construction from lot
line to lot line means there are limited retention and treatment options. A rooftop approach is
selected.
Step 4: Select BMPs to Meet the Retention and Treatment Requirements.
As an initial estimate, 60% of the rooftop is proposed to be converted to a green roof, with an
additional 15% of the remaining rooftop draining to it. Therefore, the land use values need to be
changed to account for the green roof: 26,136 square feet should be counted as impervious area
for the rooftop, and 39,204 square feet should be counted as BMP. There will be only one SDA.
For the green roof CDA, 9,801 square feet should be counted as impervious cover, and 39,204
should be counted as BMP surface area. The goal of this design is to capture the entire retention
volume (6,207 ft
3) in the green roof.
Step 5: Size the BMPs According to the Design Equations.
The green roof needs to be sized according to Equation 3.1. Note that, since green roofs are
typically manufactured systems, several of the parameters, such as the drainage layer depth and
maximum water retention of all layers, need to be provided by the manufacturer. In this example,
a media depth of 6 inches with maximum water retention of 0.40 was chosen. The drainage layer
has a depth of 1 inch and maximum water retention of 0.15. These values are indicated in the
variable descriptions below Equation 3.1 (with each layer illustrated in Figure 3.1).
A-25

Appendix A Compliance Calculations and Design Examples
Equation 3.1 Storage Volume for Green Roofs
𝑆𝑣 = 𝑆𝐴 × [(𝑑 × 𝑀𝑊𝑅1) + (𝐷𝐿 × 𝑀𝑊𝑅2)
where:
Sv = storage volume (ft3)
SA = green roof area (ft2)
d = media depth (in.) (minimum 3 in.)
𝑀𝑊𝑅1 = verified media maximum water retention
DL = drainage layer depth (in.)
𝑀𝑊𝑅2 = verified drainage layer maximum water retention
Figure 3.1 Typical layers for a green roof.
Rearranging Equation 3.1 to find the minimum required surface area:
𝑆𝐴 = 𝑆𝑣 × 12
(𝑑 × 𝑀𝑊𝑅1) + (𝐷𝐿 × 𝑀𝑊𝑅2)
or:
A-26

Appendix A Compliance Calculations and Design Examples
𝑆𝐴 = 6,208 × 12
(6 × 0.40) + (1 × 0.15) = 29,214 ft2
Therefore, the green roof must be sized to be at least 29,214 square feet (45% of the rooftop
surface area), given the proposed depths. The original assumption was that a 39,204-square-foot
roof would be used. Since a smaller roof is feasible, the drainage areas in the spreadsheet may be
revised accordingly. If the larger green roof area is used, it could be designed with a lower media
depth, or the increased storage volume could be used to reduce peak flow volume requirements
(see Step 8) and/or sold as SRCs.
Step 6: Check Design Assumptions and Requirements.
Key assumptions and requirements for this site include:
 Ensure there is sufficient space on the rooftop (allowing for structures such as vents, steep
areas of the roof, and other panels). In this case, the green roof area of 29,214 square feet is
less than half of the entire roof area.
 At least 19,791 square feet of the rooftop not covered by green roof needs to be designed to
drain to the green roof without damaging or overloading it. This may require level spreaders
or other devices.
Since all of these assumptions and requirements can be met in this design example, this step is
complete.
Step 7: Use the Adjusted Curve Number to Address Peak Flow Requirements.
The initial CN for this site is 98, but retention provided by the green roof changes this number.
Adjusted Curve Numbers for the 2-year, 15-year, and 100-year storms are 86, 88, and 88,
respectively. These CNs can be used to help determine detention requirements for this site.
Step 8: Determine Detention Requirements.
Detention is required to reduce the peak discharge rate from the 2-year-storm event to the
predevelopment (meadow conditions or better) peak discharge rate and to reduce the peak
discharge rate from the 15-year storm event to the pre-project peak discharge rate. Appendix I -
- Acceptable Hydrologic Methods and Models details the procedure to calculate the detention
volume. In this example, the proposed land cover is the same as the pre-project conditions, so
detention is not required for the 15-year storm. However, detention is required for the 2-year
storm.
The peak inflow,
qi2, and the peak outflow, qo2, can be calculated using the WinTR-55 Small
Watershed Hydrology program, the area of the site, the time of concentration (Tc, assumed to be
10 minutes), and the CNs. The reduced CN of 86, determined above, generates a qi2 of 3.92 cfs.
The CN for meadow in good condition, 71, generates a qo2 of 1.83 cfs.
The ratio of 1.83 cfs to 3.92 cfs equals 0.47. Using Figure H.1, this equates to a ratio of storage
volume (Vs
2) to runoff volume (Vr2) of approximately 0.29.
A-27

Appendix A Compliance Calculations and Design Examples
The runoff with BMPs is 1.83 inches (QBMP), which equates to 9,964 cubic feet (Vr2). Using the
calculated ratio of Vs2/Vr2, the storage volume required for the site (Vs2) is 2,890 cubic feet.
Rooftop Storage (see Appendix J - Rooftop Storage Design Guidance and Criteria) may be the
most cost-effective method for achieving the detention volume in this example, if space is
available and the design configuration can be created that routes the green roof to the rooftop
storage. Alternatively, the required storage could be achieved via a tank located somewhere in
the building.
Design Example 6
Step 1: Determine Design Criteria
Design Example 6 includes the following proposed design criteria:
Site Name Connecticut Ave. Complex
Total Site Area 65,340 ft2
Natural Cover Area 0 ft2
Compacted Cover 0 ft2
Impervious Cover (Rooftop) 65,340 ft2
Vehicular Access Areas 0 ft2
Is site located within the AWDZ? No
Is site located within the MS4? Yes
What type of activity is the site
undergoing? Major Land-Disturbing
Step 2: Input Design Criteria to Determine the Retention and Treatment Requirements.
Based on the design criteria above, the Connecticut Ave. Complex project is required to treat 1.2
inches of rainfall for the SWRv:
𝑆𝑊𝑅𝑣 = 6,207 ft3
Step 3: Identify Site Constraints and BMP Restrictions.
The key consideration for the Connecticut Ave. Complex project is that since it is a rooftop-only
site, very few treatment options are available.
Step 4: Select BMPs to Meet the Retention and Treatment Requirements.
Rainwater harvesting (R-1) is selected as the most appropriate BMP for this site.
The site will ultimately have one outlet point, and therefore one SDA.
The Rainwater Harvesting Retention Calculator should be used to determine the cistern size and
the associated retention value. In the Rainwater Harvesting Retention Calculator, enter 65,340
A-28

Appendix A Compliance Calculations and Design Examples
square feet as the CDA. For utilization of the rainwater, flushing toilets/urinals is selected as the
use, and the appropriate values are entered. In this case, 1,600 people will use the building per
day, Monday through Friday, 8 hours per day. On the Storage Volume Results sheet, the storage
volume values are given for various tank sizes. The table and graph show that an 80,000-gallon
tank would have 6,823 cubic feet of storage.
The cistern will have a 65,340-square-foot CDA and a storage volume of 6,823 cubic feet, of
which 100% is retained. The SWRv has been met for the site, and the exceedance of 4,605
gallons may be available to generate SRCs.
Step 5: Size the BMPs According to the Design Equations.
The size of the rainwater-harvesting cistern was already determined to be 80,000 gallons,
although additional volume may be necessary for detention, as described in Step 8, as well as for
dead storage for a pump, and/or freeboard.
Step 6: Check Design Assumptions and Requirements.
Key assumptions and requirements for this site include the following:
 The rainwater harvesting cistern will be at least 80,000 gallons. The designer would need to
ensure that space would be available for these BMPs on the site.
 Demand for the water from toilet flushing should be verified.
Since all of these assumptions and requirements can be met in this design example, this step is
complete.
Step 7: Use the Adjusted Curve Number to Address Peak Flow Requirements.
The initial CN for this site is 98, but retention provided by rainwater harvesting changes this
number. The reduced CNs for the 2-year, 15-year, and 100-year storms are 84, 86, and 87,
respectively. These CNs can be used to help determine detention requirements for this site.
Step 8: Determine Detention Requirements.
Detention is required to reduce the peak discharge rate from the 2-year-storm event to the
predevelopment (meadow conditions or better) peak discharge rate and to reduce the peak
discharge rate from the 15-year storm event to the pre-project peak discharge rate. Appendix I -
- Acceptable Hydrologic Methods and Models details the procedure to calculate the detention
volume. In this example, the proposed land cover is the same as the pre-project conditions, so
detention is not required for the 15-year storm. However, detention is required for the 2-year
storm.
The peak inflow (
qi2) and the peak outflow (qo2) can be calculated using the WinTR-55 Small
Watershed Hydrology program, the area of the site, the time of concentration (Tc, assumed to be
10 minutes), and the CNs. The reduced CN of 84, determined above, generates a qi2 of 3.61 cfs.
The CN for meadow in good condition, 71, generates a qo2 of 1.74 cfs.
A-29

Appendix A Compliance Calculations and Design Examples
The ratio of 1.74 cfs to 3.61 cfs equals 0.48. Using Appendix I -  - Acceptable Hydrologic
Methods and Models, this equates to a ratio of storage volume (Vs2) to runoff volume (Vr2) of
approximately 0.29.
The runoff with BMPs is 1.71 inches (QBMP), which equates to 9,295 cubic feet (Vr2). Using the
calculated ratio of Vs2/Vr2, the storage volume required for the site (Vs2) is 2,696 cubic feet.
Since rainwater harvesting is the selected BMP on this project, the most appropriate means for
detaining the 2,696 cubic feet (20,163 gallons) may be to increase the size of the cistern to
13,500 cubic feet (101,000 gallons). Alternatively, if stage-storage routing is performed on the
tank for a 2-year storm event, beginning with the average daily volume in the tank, the detention
volume may be decreased significantly.
Design Example 7
Step 1: Determine Design Criteria
Design Example 7 includes the following proposed design criteria:
Site Name Anacostia School
Total Site Area 77,000 ft2
Natural Cover Area 0 ft2
Compacted Cover 2,000 ft2
Impervious Cover 10,000 ft2
Vehicular Access Areas 0 ft2
Exempt Areas 65,000 ft2
Is site located within the AWDZ? No
Is site located within the MS4? No
What type of activity is the site
undergoing? Major Land-Disturbing
A-30

Appendix A Compliance Calculations and Design Examples
Step 2: Input Design Criteria to Determine the Retention and Treatment Requirements.
Because a portion of the site is exempt from stormwater management requirements, only the
impervious cover and compacted cover areas are counted towards calculating the SWRv for the
project. Based on the design criteria above, Anacostia School has the following requirements:
𝑆𝑊𝑅𝑣 = 1,000 ft3
Step 3: Identify Site Constraints and BMP Restrictions.
Key considerations for Anacostia School include the following:
 Because the permeable athletic field is publically accessible at the school, the athletic field
area is exempt from stormwater management requirements.
 The site has poor infiltration rates, so underdrains will be required for any BMPs.
Step 4: Select BMPs to Meet the Retention and Treatment Requirements.
While there are numerous options for stormwater management of this site, a traditional
bioretention (B-1) was selected. Since the site has poor infiltration, an underdrain is required and
the enhanced bioretention option is not available.
The site will ultimately have one outlet point and therefore one SDA.
The bioretention area will receive runoff from the impervious area of the site. Through trial and
error, it was determined that a 1,000-square-foot bioretention area would be sufficient to meet
the retention requirement. This area will be taken from the compacted cover area. Compacted
cover will now be 1,000 square feet, and BMP will be 1,000 square feet. Impervious cover
A-31

Appendix A Compliance Calculations and Design Examples
directed to the bioretention area will be 10,000 square feet. There will also be 1,000 square feet
of compacted cover and 1,000 square feet of BMP surface area directed to the bioretention area.
Because the site is in the CSS, there is no need to consider vehicular access areas.
The total volume directed to the bioretention area will be 1,516 cubic feet. A bioretention storage
volume of 1,900 cubic feet would lead to an exceedance of 524 gallons for the SWRv.
Step 5: Size the BMPs According to the Design Equations.
To meet the bioretention criteria, the bioretention area is sized with 3 feet of filter media, 1 foot
of gravel, and a 0.75-foot ponding depth. The bioretention cell sizing goal is 1,900 cubic feet.
Step 5.1: Check the Filter Media Depth.
Ensure that the filter media depth does not exceed the maximum in Table 3.20. The ratio of the
surface area of the BMP (1,000 square feet) to the CDA (12,000 square feet) is 8.3%. The Rv for
the CDA to the bioretention practice is 0.89. There is no maximum filter media depth with this
design.
Table 3.20 Determining Maximum Filter Media Depth (feet)
SA:CDA
(%)
RvCDA
0.25 0.3 0.40 0.50 0.60 0.70 0.80 0.90 0.95
0.5 6.5 6.5 6.5 6.5 6.5 6.5 6.5 6.5 6.5
1.0 5.0 5.5 6.0 6.5 6.5 6.5 6.5 6.5 6.5
1.5 3.5 4.0 5.0 6.0 6.0 6.5 6.5 6.5 6.5
2.0  3.0 4.0 4.5 5.5 6.0 6.0 6.5 6.5
2.5   3.5 4.0 4.5 5.0 5.5 6.0 6.0
3.0    3.5 4.0 4.5 5.0 5.5 5.5
3.5    3.0 3.5 4.0 4.5 5.0 5.0
4.0     3.0 3.5 4.0 4.5 4.5
4.5      3.5 3.5 4.0 4.0
5.0       3.5 4.0 4.0
5.5        3.5 3.5
6.0        3.0 3.5
6.5         3.0
7.0+
Step 5.2: Determine Storage Volume.
Equation 3.5
𝑆𝑣 = 𝑆𝐴𝑏𝑜𝑡𝑡𝑜𝑚 × �(𝑑𝑚𝑒𝑑𝑖𝑎 × 𝜂𝑚𝑒𝑑𝑖𝑎) + �𝑑𝑔𝑟𝑎𝑣𝑒𝑙 × 𝜂𝑔𝑟𝑎𝑣𝑒𝑙��+ (𝑆𝐴𝑎𝑣𝑒𝑟𝑎𝑔𝑒 × 𝑑𝑝𝑜𝑛𝑑𝑖𝑛𝑔)
where:
A-32

Appendix A Compliance Calculations and Design Examples
Sv = total storage volume of bioretention (ft3)
SAbottom = bottom surface area of bioretention (ft2)
dmedia = depth of the filter media, including mulch layer (ft)
ηmedia = effective porosity of the filter media (typically 0.25)
dgravel = depth of the underdrain and underground storage gravel layer,
including choker stone (ft)
ηgravel = effective porosity of the gravel layer (typically 0.4)
SAaverage = average surface area of the bioretention (ft2)
typically, where SAtop is the top surface area of bioretention,
dponding = maximum ponding depth of the bioretention (ft)
Solving Equation 3.5 often requires an iterative approach to determine the most appropriate
bottom surface area and average surface area to achieve the desired Sv. In this case, a
bioretention with a 40-foot by 25-foot top area and 3H:1V side slopes will provide an SA
top of
1,312.5 square feet, an SAbottom of 1,000 square feet, an SAaverage of 1,156 square feet, and achieve
an Sv of 2,306 cubic feet. This more than meets the goal of 1,900 cubic feet. If desired, the
surface area of the practice could be reduced accordingly, or more SRCs could be generated with
the excess volume.
Step 6: Check Design Assumptions and Requirements.
Key assumptions and requirements for this site include the following:
topbottom
average
SASASA +=
A-33

Appendix A Compliance Calculations and Design Examples
 Based upon the above design the bioretention cell will require at least 1,000 square feet of
surface area. The designer would need to ensure that space would be available for the
bioretention.
 The CDA for traditional bioretention must be 2.5 acres or less and this site is less than 1 acre.
 The required head for the above design will be 4.75 feet, including ponding depth (9 inches),
mulch (3 inches), filter media (33 inches), choking layer (about 3 inches), and gravel layer (9
inches). The outlet for the underdrain must be at least this deep.
 The water table must be at least 2 feet below the underdrain, or 6.75 feet below the surface.
According to the Soil Survey, Croom soils have greater than a 5-foot depth. On-site soil
investigations will be needed to determine if the 6.75-foot depth to the groundwater table can
be met on this site.
Since all of these assumptions and requirements can be met in this design example (pending
groundwater table investigations), this step is complete.
Step 7: Use the Adjusted Curve Number to Address Peak Flow Requirements.
The original site CN of 94 is reduced for the 2-year, 15-year, and 100-year storms to 70, 77, and
80, respectively, by the retention provided by the bioretention cell. These values can be used to
help determine detention requirements for this site.
Step 8: Determine Detention Requirements.
Detention is not required.
Design Example 8
Step 1: Determine Design Criteria.
Site Name Southwest Mixed-Use
Development
Total Site Area 40,000 ft2
Natural Cover Area 0 ft2
Compacted Cover 2,000 ft2
Impervious Cover 38,000 ft2
Vehicular Access Areas 0 ft2
Is site located within the AWDZ? No
Is site located within the MS4? No
What type of activity is site undergoing? Major Land-Disturbing
A-34

Appendix A Compliance Calculations and Design Examples
Step 2: Input Design Criteria to Determine the Retention and Treatment Requirements.
Based on the design criteria above, Southwest Mixed-Use Development has the following
requirements:
𝑆𝑊𝑅𝑣 = 3,660 ft3
Step 3: Identify Site Constraints and BMP Restrictions.
Key considerations for Southwest Mixed-Use Development include the following:
 Groundwater is high, so any BMPs in the ground will be shallow.
 The soil infiltration rates are poor, so underdrains will be required.
 The building roof has several tenant amenities planned that will restrict the area for any
stormwater BMPs.
 This site is part of the CSS that is in a sewershed where CSOs will be reduced with storage
tunnels.
Step 4: Select BMPs to Meet the Retention and Treatment Requirements.
Green roof (G-1) and permeable pavers (P-3) were selected to manage the stormwater.
The site will ultimately have one outlet point, and therefore one SDA.
The roof of the building has several amenities that tenants can access; therefore, the green roof
size is restricted to 4,600 square feet. No additional roof area drains to the green roof; the CDA is
the green roof area. Since green roofs are typically manufactured systems, several of the
parameters, such as the drainage layer depth and maximum water retention of all layers, need to
A-35

Appendix A Compliance Calculations and Design Examples
be provided by the manufacturer. The values for the roof used in this design are provided in the
variable descriptions below Equation 3.1 (with each layer illustrated in Figure 3.1).
Figure 3.1 Typical layers for a green roof.
Equation 3.1 Storage Volume for Green Roofs
𝑆𝑣 = 𝑆𝐴 × [(𝑑 × 𝑀𝑊𝑅1) + (𝐷𝐿 × 𝑀𝑊𝑅2)]
where:
Sv = storage volume (ft3)
SA = green roof area (ft2) (4,600 ft2)
d = media depth (in.) (8 in.)
𝑀𝑊𝑅1 = verified media maximum water retention (0.45)
DL = drainage layer depth (in.) (1 in.)
𝑀𝑊𝑅2 = verified drainage layer maximum water retention (0.9)
𝑆𝑣 = 4,600 𝑓𝑡2 × [(8 𝑖𝑛 × 0.45) + (1 𝑖𝑛 × 0.9)]
12 = 1,725 𝑓𝑡3
As designed, the green roof has a storage volume of 1,725 cubic feet.
The permeable pavement requires an underdrain and is categorized as a standard design. When
designing permeable pavement, ensure that the permeable pavement is sized to store the SWRv
in the reservoir layer. The reservoir depth can be determined by using Equation 3.2.
A-36

Appendix A Compliance Calculations and Design Examples
Equation 3.2 Reservoir Layer or Infiltration Sump Depth
𝑑𝑝 =
�𝑃 × 𝑅𝑣𝐼 × 𝐶𝐷𝐴
𝐴𝑝
� − �𝐾𝑠𝑎𝑡 × 𝑡𝑓�
𝜂𝑟
where:
dp = depth of the reservoir layer (or depth of the infiltration sump for enhanced
designs with underdrains) (ft)
P = rainfall depth for the SWRv or other design storm (ft)
RvI = 0.95 (runoff coefficient for impervious cover)
CDA = total contributing drainage area, including permeable pavement surface area
(ft
2) (6,000 ft2)
Ap = permeable pavement surface area (ft2) (6,000 ft2)
Ksat = field-verified saturated hydraulic conductivity for the subgrade soils (ft/day).
If an impermeable liner is used in the design then 𝐾𝑠𝑎𝑡 =  0.
tf = time to fill the reservoir layer (day) (assume 2 hours or 0.083 day)
 = 0.4 (effective porosity for the reservoir layer)
𝑑𝑝 =
�0.1 𝑓𝑡 × 0.95 × 6,000 ft2
6,000 ft2 � − (0 × 2 ℎ𝑟)
0.4 = 0.24 𝑓𝑡 = 2.85 𝑖𝑛
The permeable paver design requires a reservoir depth of 8 inches to support vehicular traffic, so
this 8-inch depth will easily store the SWRv.
To determine the total storage volume provided by the practice, Sv, use Equation 3.4.
Equation 3.4 Permeable Pavement Storage Volume
𝑆𝑣 = 𝐴𝑝[(𝑑𝑝 × 𝜂𝑟) + 𝐾𝑠𝑎𝑡 × 𝑡𝑓]
where:
Sv = storage volume (ft3)
dp = depth of the reservoir layer (or depth of the infiltration sump for enhanced
designs with underdrains) (ft) (0.67 ft)
rη
A-37

Appendix A Compliance Calculations and Design Examples
 = 0.4 (effective porosity for the reservoir layer)
Ap = permeable pavement surface area (ft2) (6,000 ft2)
Ksat = field-verified saturated hydraulic conductivity for the subgrade soils (ft/day).
If an impermeable liner is used in the design then 𝐾𝑠𝑎𝑡 =  0.
tf = time to fill the reservoir layer (days) (assume 2 hours or 0.083 days)
𝑆𝑣 = 6,000 𝑓𝑡2 �(0.67 𝑓𝑡× 0.4) + 0 𝑓𝑡
𝑑𝑎𝑦× 0.0083𝑑𝑎𝑦𝑠�= 1,608 𝑓𝑡2
The surface area of 6,000 square feet should be counted as BMP cover. The total stormwater
volume retained on-site by the green roof and permeable pavement is 889 cubic feet, well below
the SWRv of 3,660 cubic feet. Less than 50% of the SWRv was retained by the BMPs; however,
this site is located in a sewershed in the CSS where CSOs will be reduced with storage tunnels.
Therefore, the remaining SWRv can be obtained through Offv without going through the “relief
through extraordinarily difficult site conditions” process.
Step 5: Check Design Assumptions and Requirements.
Key assumptions and requirements for this site include the following:
 No additional roof runoff drains to the green roof.
 Shallow groundwater and poor infiltration means that the permeable pavement will require
an underdrain.
Since all of these assumptions and requirements can be met in this design example, this step is
complete.
Step 6: Use the Adjusted Curve Number to Address Peak Flow Requirements.
rη
A-38

Appendix A Compliance Calculations and Design Examples
Values for C soils results in a CN of 74 for turf and 98 for impervious cover. The original site
CN of 97 is reduced for the 2-year, 15-year, and 100-year storms to 86, 88, and 88, respectively,
by the retention provided by the green roof and the permeable pavers. These values can be used
to help determine detention requirements for this site.
Step 7: Determine Detention Requirements.
Detention is required to reduce the peak discharge rate from the 2-year storm event to the
predevelopment (meadow conditions or better) peak discharge rate and to reduce the peak
discharge rate from the 15-year storm event to the pre-project peak discharge rate. Appendix I -
- Acceptable Hydrologic Methods and Models includes details on how to calculate the detention
volume. In this example, the proposed runoff CN are less than the pre-project conditions, so
detention for the 15-year storm is not required. Detention for the 2-year storm will be required.
The peak inflow (qi2) and the peak outflow (qo2) can be calculated using the WinTR-55 Small
Watershed Hydrology program, the area of the site, the time of concentration (Tc, assumed to be
10 minutes), and the CNs. The reduced CN of 86, determined above, generates a qi2 of 2.40
cubic feet per second (cfs). The CN for meadow in good condition, 71, generates a qo2 of 1.07
cfs.
The ratio of 1.07 cfs to 2.40 cfs equals 0.46. Using Figure H.1, the ratio of storage volume (Vs2)
to runoff volume (Vr2) is 0.29.
The runoff volume is 1.83 inches (QBMP), which equates to 6,100 cubic feet (Vr2). Using the
calculated ratio of Vs2/Vr2, the storage volume required for the site (Vs2) is 1,769 cubic feet.
With appropriate orifice design to ensure that outflows are properly restricted, this detention
volume may be located elsewhere on the site as a standalone detention practice.
A-39