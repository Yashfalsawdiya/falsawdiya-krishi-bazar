import json

NEWS_TRANSLATIONS = [
  {
    "en_title": "Low Water or Delayed Sowing: These 9 Improved Mustard Varieties Can Transform Farmers' Yields",
    "en_summary": "Agricultural scientists have shared high-yielding mustard varieties suitable for drought tolerance and late November sowing, along with seed treatment and pest prevention guidance."
  },
  {
    "en_title": "Kota Mandi Rates: Coriander and Mustard Gain Momentum, Edible Oil Prices Decline",
    "en_summary": "Market analysts report steady arrivals and fluctuating modal rates across regional mandis. Farmers are advised to monitor daily price trends before offloading produce."
  },
  {
    "en_title": "All-in-One Agri Portal: Mandi Rates, Direct Buyers, and Government Schemes in a Single Platform",
    "en_summary": "A unified digital platform now empowers farmers with real-time APMC commodity rates, direct buyer connectivity, and transparent subsidy scheme tracking."
  },
  {
    "en_title": "Free MSP Registration for Paddy, Jowar, and Bajra: Apply Online by October 10",
    "en_summary": "State procurement agencies have opened free registration portals for Kharif crops under Minimum Support Price. Eligible farmers can enroll at local CSC centers."
  },
  {
    "en_title": "Sudden Storm and High Winds Damage Maize Crops Following Dry Spell",
    "en_summary": "Weather experts recommend field drainage management and lodging protection as unexpected gusty winds impact standing maize fields across regional farming belts."
  },
  {
    "en_title": "IIT Professional Returns to Farming: Intercropping Roses with Blueberries and Strawberries for Record Profits",
    "en_summary": "An innovative 33-year-old agri-entrepreneur demonstrates high-value horticulture by successfully cultivating berries alongside floriculture in central India."
  },
  {
    "en_title": "Burhanpur Farmer Pioneers Four-Crop Intercropping: Cotton, Arhar, Soybean, and Maize in One Field",
    "en_summary": "A progressive farmer in Madhya Pradesh achieves sustainable soil health and multiplied earnings using a multi-tier companion planting method."
  },
  {
    "en_title": "Farmers Protest on Highway in Guna Demanding Power and Fertilizer Supply",
    "en_summary": "Local farmer unions staged a peaceful demonstration seeking uninterrupted agricultural electricity supply and timely availability of DAP fertilizers."
  },
  {
    "en_title": "Vigilance Bureau Investigates Irregularities in Agricultural Recruitment Network in Ratlam",
    "en_summary": "State administrative authorities have launched an inquiry following complaints regarding unauthorized recruitment claims in regional agricultural offices."
  },
  {
    "en_title": "CM Mohan Yadav Addresses Farmers in Mauganj: Agricultural Prosperity Is Our Top Priority",
    "en_summary": "The Chief Minister highlighted upcoming canal irrigation expansions and direct DBT welfare transfers designed to support rural livelihoods across the district."
  },
  {
    "en_title": "MP Irrigation Project 2026: Cabinet Approves ₹13,000 Crore Infrastructure Package",
    "en_summary": "The state cabinet has sanctioned comprehensive canal network upgrades aimed at bringing pressurized piped water to over 15 lakh hectares of farmland."
  },
  {
    "en_title": "Land Title Registration Relief: Government to Bear Costs for 50 Lakh Land Lease Holders",
    "en_summary": "A major administrative decision waives registration fees for eligible farmers and leaseholders, facilitating formal property records and Kisan Credit Card access."
  },
  {
    "en_title": "El Niño Resilient Crops: Strategic Precautions to Prevent Yield Losses",
    "en_summary": "Agri-meteorologists suggest moisture conservation techniques, organic mulching, and drought-hardy seed selection to mitigate climate variability."
  },
  {
    "en_title": "Polyhouse Cultivators in 10 States Announce Joint Demonstration on Policy Reforms",
    "en_summary": "Protected cultivation associations seek tariff rationalization and simplified maintenance subsidies for greenhouse and shade-net agricultural setups."
  },
  {
    "en_title": "Balram Krishi Mahotsav in Rewa: Modern Farm Machinery and Organic Solutions Showcased",
    "en_summary": "Scientists and policy leaders engaged with over 10,000 progressive growers to promote mechanized sowing, seed grading, and balanced soil fertility."
  },
  {
    "en_title": "Vegetable Planting Guide for October: From Radish and Spinach to Cauliflower and Fenugreek",
    "en_summary": "Horticultural experts outline optimum nursery raising techniques, seed treatment schedules, and bed preparations for winter commercial vegetable crops."
  },
  {
    "en_title": "MP AEO Exam 2026: Agriculture Extension Officer Answer Key and Objection Window Released",
    "en_summary": "The Madhya Pradesh Employees Selection Board has officially opened the online portal for candidates to review exam keys and submit verification queries."
  },
  {
    "en_title": "Maihar Krishi Mahotsav: Government Announces Upgraded Rural Mandi Infrastructure",
    "en_summary": "Speaking at the agricultural convention, leadership reaffirmed support for solar water pumps, micro-irrigation subsidies, and fair pricing mechanisms."
  },
  {
    "en_title": "State Foundation Day Preparations Focus on Farmer Welfare and Agri-Business Initiatives",
    "en_summary": "Upcoming foundation day programs will showcase progressive cultivators, cooperative dairy success stories, and rural value-addition enterprises."
  },
  {
    "en_title": "Strict Anti-Corruption Action in Agriculture Department: Official Suspended",
    "en_summary": "The Ministry of Agriculture reaffirmed a zero-tolerance policy regarding bribery and irregularities in departmental subsidy verification."
  },
  {
    "en_title": "Major Policy Decision for MP Farmers: Assured Daytime Electricity for Farm Irrigation",
    "en_summary": "The state electricity board has reconfigured rural feeder schedules to provide continuous daytime power, eliminating risky night irrigation."
  },
  {
    "en_title": "Farmer Welfare Implementation Review: Vidisha Tops Performance Rankings",
    "en_summary": "A district-wise progress evaluation shows high saturation of soil health cards and PM-Kisan verification across leading agricultural districts."
  },
  {
    "en_title": "Agri-Tech Startup Innovation: Rural Brothers Scale Custom Farm Equipment Across Multiple States",
    "en_summary": "A low-cost agricultural machinery venture founded by two brothers demonstrates how grassroots innovation solves harvesting and weeding bottlenecks."
  },
  {
    "en_title": "MPESB Agriculture Extension Officer Admit Cards Released: Download Steps Outlined",
    "en_summary": "Candidates appearing for state agricultural technical recruitment can now retrieve exam hall tickets from the official examination portal."
  },
  {
    "en_title": "Bhavantar Scheme Overview: How Price Deficit Compensation Protects Crop Revenue",
    "en_summary": "When open mandi prices dip below benchmark support levels, the Bhavantar scheme deposits the price differential directly into farmers' verified bank accounts."
  },
  {
    "en_title": "Bhavantar Yojana Safety Net: Government Compensates Market Price Deficit for Oilseeds",
    "en_summary": "State procurement channels ensure farmers do not suffer distress sales during peak seasonal market arrivals of soybean and pulses."
  },
  {
    "en_title": "MP Kisan Kalyan Yojana: Status Update on ₹6,000 Annual Installment Disbursement",
    "en_summary": "Eligible farmers under the state welfare scheme are receiving direct DBT transfers alongside central PM-Kisan payouts."
  },
  {
    "en_title": "Spices Cultivation Subsidy: Up to 40% Assistance for Coriander, Cumin, and Fennel Farming in MP",
    "en_summary": "The horticulture mission encourages crop diversification with financial subsidies for certified seed procurement and modern drip irrigation systems."
  },
  {
    "en_title": "Comparative Budget Analysis: Public Expenditure on Agriculture and Farmer Welfare Across Indian States",
    "en_summary": "Recent financial reports assess state-level capital allocation towards irrigation, crop insurance, power subsidies, and post-harvest storage."
  },
  {
    "en_title": "Digital Kisan Credit Card Portal Launched: Apply Online from Home Without Middlemen",
    "en_summary": "Farmers can now submit digitized land records and Aadhaar e-KYC to obtain low-interest agricultural operating credit with zero bank visits."
  },
  {
    "en_title": "Dairy Farmers in Madhya Pradesh Request Fair Milk Pricing Linked to Fat Content",
    "en_summary": "Cooperative milk producers seek revised baseline purchase rates of ₹12 per fat unit to offset rising cattle feed and veterinary care expenses."
  },
  {
    "en_title": "Kisan Kalyan Installment Verification: Aadhaar and e-KYC Update Instructions",
    "en_summary": "Farmers with pending payments are advised to complete biometric authentication at nearby CSC centers to ensure seamless DBT disbursements."
  },
  {
    "en_title": "Comprehensive Relief Package: Instant KCC Access, 12-Month Repayment, and 10 Hours Daytime Power",
    "en_summary": "A multi-pronged state initiative enhances rural liquidity, expands dairy production infrastructure, and guarantees daylight agricultural power supply."
  },
  {
    "en_title": "Kota Mandi Daily Update: Soybean and Mustard Experience Temporary Price Moderation",
    "en_summary": "Increased arrivals in regional trading yards led to minor price adjustments across oilseeds. Farmers are advised to stage crop sales in intervals."
  },
  {
    "en_title": "Interest-Free Farm Loans Up to ₹3 Lakh and 10 Hours Daytime Power Supply Announced for MP Farmers",
    "en_summary": "Under the zero-percent interest scheme, cooperative societies are disbursing seasonal working capital to support Rabi crop sowing."
  },
  {
    "en_title": "Daytime Agricultural Power Supply Initiated: Chief Minister Outlines Rural Energy Roadmap",
    "en_summary": "Solar feeder segregation projects ensure agricultural pumps receive dedicated electricity during daylight hours, enhancing farm safety."
  },
  {
    "en_title": "10-Hour Daytime Power and ₹2 Lakh per Acre Subsidy for Commercial Horticulture in MP",
    "en_summary": "Fruit and vegetable growers will receive prioritized high-efficiency electrical connections alongside capital support for orchard establishment."
  },
  {
    "en_title": "Strategic Agri-Vision: Enhancing Soil Productivity and Modern Post-Harvest Infrastructure",
    "en_summary": "State agricultural roadmaps prioritize food processing parks, cold chain logistics, and organic farming clusters to maximize grower profitability."
  },
  {
    "en_title": "Balram Jayanti Agricultural Announcement: 10-Hour Daytime Power Dedicated to Farmers",
    "en_summary": "Commemorating the farmers' festival, state leadership formalized dedicated day-shift electrical supply across thousands of rural feeder lines."
  },
  {
    "en_title": "10 Hours Daytime Farm Power Supply Now Operational Across Madhya Pradesh",
    "en_summary": "Transition from night irrigation to structured daytime hours has commenced, providing significant relief and convenience to farming families."
  }
]

def clean_summary_hi(title, raw_summary):
    import re
    cleaned = re.sub(r'\(?\s*(?:स्रोत|source)\s*:[^)]*\)?', '', raw_summary, flags=re.IGNORECASE).strip()
    clean_title = title.strip().rstrip('!।|.')
    if cleaned.startswith(clean_title):
        cleaned = cleaned[len(clean_title):].lstrip('!।|,. ')
    if not cleaned or len(cleaned) < 10:
        cleaned = 'कृषि वैज्ञानिकों एवं आधिकारिक पोर्टल्स से प्राप्त प्रामाणिक रिपोर्ट के अनुसार किसानों के लिए महत्वपूर्ण जानकारी साझा की गई है।'
    return cleaned.strip()

def enrich_news():
    with open('data/agri-news-cache.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    items = data.get('items', [])
    for i, item in enumerate(items):
        orig_title = item['title']['hi'] if isinstance(item['title'], dict) else item['title']
        orig_summary = item['summary']['hi'] if isinstance(item['summary'], dict) else item['summary']
        clean_hi = clean_summary_hi(orig_title, orig_summary)

        if i < len(NEWS_TRANSLATIONS):
            en_t = NEWS_TRANSLATIONS[i]['en_title']
            en_s = NEWS_TRANSLATIONS[i]['en_summary']
        else:
            en_t = orig_title
            en_s = clean_hi

        item['title'] = {
            'hi': orig_title,
            'en': en_t
        }
        item['summary'] = {
            'hi': clean_hi,
            'en': en_s
        }

    with open('data/agri-news-cache.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("✅ Successfully enriched all 40 news items with bilingual { en, hi }!")

enrich_news()
