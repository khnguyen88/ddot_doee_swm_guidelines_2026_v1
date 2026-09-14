# 03 – Site Drainage Areas (SDAs) & Contributing Drainage Areas (CDAs)

**Source:** `docs/doee presentation/03_SDAs & CDAs.pptx`

## Overview
Explains the distinction between SDAs and CDAs, and demonstrates how to calculate SWRv per SDA and verify BMP compliance using CDAs.

## Definitions

- **SDA (Site Drainage Area):** A drainage sub-basin within the project site. SWRv is calculated separately for each SDA. A site may have multiple SDAs.
- **CDA (Contributing Drainage Area):** The drainage area actually contributing runoff to a specific BMP. Used to size the BMP and calculate its maximum retention volume (at 1.7-inch rain event).

## Worked Example

**Site conditions:** Complete building renovation (MSI, 0.8-in) + land regrading with new sidewalks and underground parking (MLD, 1.2-in)

### SWRv by SDA

| SDA | Area (SF) | MLD SWRv (ft³) | MSI SWRv (ft³) | Total SWRv (ft³) |
|---|---|---|---|---|
| SDA #1 | 65,496 | 2,297 | 578 | **2,875** |
| SDA #2 | 66,971 | 2,732 | 1,146 | **3,878** |
| **Site Total** | **132,467** | | | **6,753** |

*SDA #1 SWRv components: 11,197 SF impervious, 43,685 SF compacted, 1,489 SF BMP (1.2-in); 9,125 SF building (0.8-in)*  
*SDA #2 SWRv components: 11,704 SF impervious, 27,289 SF compacted, 9,878 SF BMP (1.2-in); 18,100 SF building (0.8-in)*

### CDA-Based Compliance Check

Each BMP is checked against its CDA's maximum retention volume (calculated using 1.7-inch rain event):

**SDA #1 — BMP A (Bioretention):**
- Required: 2,875 ft³
- CDA area: 56,122 SF (18,067 impervious, 36,566 compacted, 1,489 BMP)
- Max retention volume at 1.7-in: 3,927 ft³
- Actual BMP retention: 2,576 ft³ → **Not fully met by BMP A alone**

**SDA #2 — BMPs B through E:**
- Required: 3,878 ft³
- Max retention volume (1.7-in): 4,475 ft³
- Actual BMP retention: 4,327 ft³ → **Requirement met**

### Final Compliance Summary

| | SWRv Required | Actual Retention |
|---|---|---|
| SDA #1 (BMP A) | 2,875 ft³ | 2,576 ft³ |
| SDA #2 (BMPs B–E) | 3,878 ft³ | 4,327 ft³ |
| **Total Site** | **6,753 ft³** | **6,903 ft³ ✓** |

## Key Points
- SWRv is always calculated and compared within each SDA, not across the whole site
- CDAs may be larger or smaller than their SDA — they define what actually drains to a BMP
- The 1.7-inch event is used to determine the **maximum** retention volume a BMP CDA can claim
- Retention from an oversized BMP in one SDA cannot offset a deficit in a different SDA
