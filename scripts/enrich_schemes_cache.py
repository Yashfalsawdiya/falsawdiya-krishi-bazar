import json

SCHEMES_EN = [
  {
    "en_title": "PM-Kisan Samman Nidhi",
    "en_desc": "Direct income support of ₹6,000 per year provided to eligible farmer families.",
    "en_obj": "To meet financial needs of small and marginal farmers for purchasing farm inputs ahead of sowing seasons.",
    "en_subsidy": "100% funded by Central Government (₹6,000 annual direct cash support in 3 equal installments)",
    "en_sector": "Direct Benefit Transfer (DBT)",
    "en_eligibility": "All landholding farmer families with cultivable land registered in their name and completed e-KYC.",
    "en_apply": "Register online at pmkisan.gov.in under 'New Farmer Registration' or visit your nearest CSC center."
  },
  {
    "en_title": "MP Chief Minister Kisan Kalyan Yojana",
    "en_desc": "Additional financial assistance of ₹6,000 per year from the Government of Madhya Pradesh to PM-Kisan beneficiaries.",
    "en_obj": "To augment farm household income and provide state-level financial backing to Madhya Pradesh farmers.",
    "en_subsidy": "100% state-funded ₹6,000 per year (combined with PM-Kisan, farmers receive ₹12,000 annually)",
    "en_sector": "State Financial Support",
    "en_eligibility": "Resident farmers of Madhya Pradesh who are verified beneficiaries of PM-Kisan Samman Nidhi.",
    "en_apply": "Verification is processed automatically through the SAARA portal (saara.mp.gov.in) with Patwari validation."
  },
  {
    "en_title": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    "en_desc": "Comprehensive crop insurance coverage against unavoidable natural risks from pre-sowing to post-harvest.",
    "en_obj": "To stabilize the income of farmers in event of crop loss caused by drought, flood, pests, or unseasonal rain.",
    "en_subsidy": "Farmers pay nominal premium (2% for Kharif, 1.5% for Rabi, 5% for commercial/horticultural crops); remainder subsidized by government.",
    "en_sector": "Crop Insurance & Risk Mitigation",
    "en_eligibility": "All farmers growing notified crops in notified areas, including sharecroppers and tenant farmers.",
    "en_apply": "Enroll through your loan bank branch, CSC center, or directly on the national crop insurance portal pmfby.gov.in."
  },
  {
    "en_title": "PM-KUSUM Solar Pump Scheme",
    "en_desc": "Capital subsidy for installing off-grid and grid-connected solar agricultural pumps.",
    "en_obj": "To de-dieselize the farm sector, provide reliable daytime irrigation, and enable farmers to generate solar income.",
    "en_subsidy": "Up to 60% capital subsidy (30% Central + 30% State) with remaining 40% financed through bank loan/farmer contribution.",
    "en_sector": "Renewable Energy & Solar Irrigation",
    "en_eligibility": "Individual farmers, water user associations, and farmer producer organizations with cultivable land.",
    "en_apply": "Apply through the state renewable energy portal (urja.mp.gov.in or pmkusum.mnre.gov.in)."
  },
  {
    "en_title": "Sub-Mission on Agricultural Mechanization (SMAM)",
    "en_desc": "Subsidies for modern farm equipment including tractors, rotavators, seed drills, and power tillers.",
    "en_obj": "To increase mechanization reach to small and marginal farmers and promote custom hiring centers.",
    "en_subsidy": "40% to 50% subsidy on purchase price of approved agricultural machinery.",
    "en_sector": "Farm Mechanization & Implements",
    "en_eligibility": "All landholding farmers registered on the state e-Krishi Yantra portal.",
    "en_apply": "Register online at the MP DBT agriculture portal (dbt.mpdage.org) during open lottery booking windows."
  },
  {
    "en_title": "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY - Per Drop More Crop)",
    "en_desc": "Financial assistance for micro-irrigation systems such as drip and sprinkler sets.",
    "en_obj": "To maximize water-use efficiency, conserve water resources, and improve crop productivity per unit of water.",
    "en_subsidy": "Up to 55% subsidy for small and marginal farmers, and 45% for other farmers.",
    "en_sector": "Micro-Irrigation & Water Conservation",
    "en_eligibility": "Farmers with an assured water source and cultivable land.",
    "en_apply": "Submit application on the state horticulture DBT portal (mpfsts.mp.gov.in) with land documents and water source details."
  },
  {
    "en_title": "Kisan Credit Card (KCC) Scheme",
    "en_desc": "Concessional institutional short-term credit for crop cultivation and allied agricultural activities.",
    "en_obj": "To provide timely and affordable credit to meet the cultivation and maintenance expenses of crops and livestock.",
    "en_subsidy": "Effective interest rate of 4% per annum upon prompt repayment (7% base rate with 3% prompt repayment incentive).",
    "en_sector": "Institutional Agri-Credit",
    "en_eligibility": "All farmers, individual or joint borrowers, tenant farmers, oral lessees, and sharecroppers.",
    "en_apply": "Apply through your local cooperative or commercial bank branch with land revenue records and identity proof."
  },
  {
    "en_title": "Soil Health Card Scheme",
    "en_desc": "Periodic soil nutrient assessment report with tailored crop-wise fertilizer dosage recommendations.",
    "en_obj": "To guide farmers in balanced fertilizer application and enhance soil fertility and long-term crop yields.",
    "en_subsidy": "100% free soil sample testing and physical card issuance by government soil laboratories.",
    "en_sector": "Soil Health & Nutrient Management",
    "en_eligibility": "All farmers with agricultural land across rural districts.",
    "en_apply": "Contact your local Rural Agriculture Extension Officer (RAEO) or Krishi Vigyan Kendra (KVK)."
  },
  {
    "en_title": "Paramparagat Krishi Vikas Yojana (PKVY - Natural & Organic Farming)",
    "en_desc": "Promotes chemical-free organic farming clusters, bio-fertilizers, and organic certification support.",
    "en_obj": "To build sustainable farm models, improve soil organic carbon, and secure premium market prices for organic produce.",
    "en_subsidy": "Financial assistance of ₹50,000 per hectare over 3 years for inputs, certification, and value addition.",
    "en_sector": "Organic & Natural Farming",
    "en_eligibility": "Farmers willing to form clusters of 20 or more members practicing non-chemical agriculture.",
    "en_apply": "Connect with your district Deputy Director of Agriculture or nearby Krishi Vigyan Kendra cluster coordinator."
  },
  {
    "en_title": "MP Chief Minister Solar Pump Scheme",
    "en_desc": "Dedicated solar water pumping initiative for farms lacking reliable conventional grid electricity.",
    "en_obj": "To provide permanent irrigation access in non-electrified agricultural pockets across Madhya Pradesh.",
    "en_subsidy": "Up to 90% subsidy for small and scheduled category farmers on approved 2HP to 7.5HP solar pumps.",
    "en_sector": "State Solar Irrigation",
    "en_eligibility": "Farmers of Madhya Pradesh having land away from existing electric power lines.",
    "en_apply": "Apply online at cmsolarpump.mp.gov.in with land revenue records and electricity NOC."
  },
  {
    "en_title": "Bhavantar Bhugtan Yojana (Price Deficit Scheme)",
    "en_desc": "State safety net compensating farmers for the gap between market prices and benchmark support levels.",
    "en_obj": "To prevent distress selling during peak harvest arrivals in Mandis and protect farm revenue.",
    "en_subsidy": "Direct bank transfer of price differential when market modal rate falls below Minimum Support Price.",
    "en_sector": "Price Support & Market Assurance",
    "en_eligibility": "Registered farmers in MP who sell notified crops (such as soybean and maize) in approved APMC mandis.",
    "en_apply": "Register on the e-Uparjan portal during the state registration period prior to crop harvest."
  },
  {
    "en_title": "National Livestock Mission (NLM)",
    "en_desc": "Capital subsidy and credit support for commercial goat, sheep, poultry, and dairy farming enterprises.",
    "en_obj": "To expand livestock productivity, generate rural employment, and enhance availability of quality animal protein.",
    "en_subsidy": "Up to 50% capital subsidy (up to ₹50 lakh for breed multiplication farms).",
    "en_sector": "Animal Husbandry & Dairy Development",
    "en_eligibility": "Farmers, individual entrepreneurs, Self Help Groups, and Farmer Producer Organizations.",
    "en_apply": "Submit project proposal on the official portal nlm.udyamimitra.in with bank loan sanction."
  },
  {
    "en_title": "Pradhan Mantri Matsya Sampada Yojana (PMMSY)",
    "en_desc": "Comprehensive scheme for inland fisheries, aquaculture pond construction, and biofloc units.",
    "en_obj": "To enhance fish production, modernize post-harvest supply chains, and double fishers' income.",
    "en_subsidy": "40% subsidy for general category and 60% for women/SC/ST beneficiaries on approved project costs.",
    "en_sector": "Fisheries & Aquaculture",
    "en_eligibility": "Fishers, fish farmers, Self Help Groups, and rural youth interested in commercial aquaculture.",
    "en_apply": "Apply through the District Fisheries Department or online at pmmsy.dof.gov.in."
  },
  {
    "en_title": "Agriculture Infrastructure Fund (AIF)",
    "en_desc": "Medium to long-term debt financing facility for post-harvest management infrastructure and community farming assets.",
    "en_obj": "To create modern cold storages, warehouses, sorting-grading units, and primary processing centers.",
    "en_subsidy": "3% interest subvention per annum on loans up to ₹2 crore for up to 7 years, with credit guarantee coverage.",
    "en_sector": "Post-Harvest Agri-Infrastructure",
    "en_eligibility": "Agri-entrepreneurs, startups, FPOs, PACS, and primary marketing cooperative societies.",
    "en_apply": "Register and submit detailed project report on the national portal agriinfra.dac.gov.in."
  },
  {
    "en_title": "PM Kisan Maandhan Yojana (Farmers Pension Scheme)",
    "en_desc": "Voluntary and contributory pension scheme providing monthly financial security to old-age farmers.",
    "en_obj": "To provide old-age income security of ₹3,000 per month to small and marginal farmers upon reaching 60 years.",
    "en_subsidy": "50% monthly contribution matched equally by the Central Government into the farmer's pension account.",
    "en_sector": "Social Security & Pension",
    "en_eligibility": "Small and marginal farmers aged between 18 and 40 years possessing up to 2 hectares of cultivable land.",
    "en_apply": "Enroll at your nearest CSC center or online through maandhan.in with Aadhaar and bank details."
  },
  {
    "en_title": "GOBARdhan Scheme & Community Biogas Subsidy",
    "en_desc": "Support for converting cattle dung and organic farm waste into clean biogas, bio-CNG, and organic slurry.",
    "en_obj": "To improve village sanitation, generate green energy for rural households, and provide rich organic manure.",
    "en_subsidy": "Financial assistance up to ₹50 lakh for commercial bio-CNG units and up to ₹25,000 for household biogas units.",
    "en_sector": "Waste to Wealth & Clean Energy",
    "en_eligibility": "Gram Panchayats, dairy farmer cooperatives, private entrepreneurs, and farmer groups.",
    "en_apply": "Apply through the Swachh Bharat Mission portal (gobardhan.co.in) or state nodal energy agencies."
  },
  {
    "en_title": "Mission for Integrated Development of Horticulture (MIDH)",
    "en_desc": "Holistic development program supporting orchards, vegetable protected cultivation, polyhouses, and pack houses.",
    "en_obj": "To enhance horticultural production, improve nutritional security, and double growers' returns.",
    "en_subsidy": "40% to 50% capital subsidy on greenhouse polyhouses, tissue culture labs, and fruit plantation costs.",
    "en_sector": "Commercial Horticulture & Floriculture",
    "en_eligibility": "Individual farmers, SHGs, and cooperatives growing notified fruit, flower, and vegetable varieties.",
    "en_apply": "Submit application on the state horticulture DBT portal (mpfsts.mp.gov.in) with land revenue records."
  },
  {
    "en_title": "National Beekeeping & Honey Mission (NBHM)",
    "en_desc": "Subsidies for commercial beekeeping, honeybee colonies, modern hives, and honey processing units.",
    "en_obj": "To promote scientific beekeeping, increase crop pollination yields, and generate additional rural revenue.",
    "en_subsidy": "Up to 50% subsidy on beehives, honey extractors, and custom honey processing equipment.",
    "en_sector": "Beekeeping & Apiculture",
    "en_eligibility": "Farmers, beekeepers, rural youth, and Farmer Producer Organizations trained in apiculture.",
    "en_apply": "Apply through the National Bee Board portal (nbhm.gov.in) or District Horticulture Officer."
  },
  {
    "en_title": "e-National Agriculture Market (e-NAM)",
    "en_desc": "Pan-India electronic trading portal networking existing APMC mandis to create a unified national market.",
    "en_obj": "To promote transparent price discovery, offer wider competitive bidding from pan-India buyers, and ensure direct online payments.",
    "en_subsidy": "Free membership, zero registration fee for farmers, and digital quality assaying at connected mandis.",
    "en_sector": "Digital Agricultural Marketing",
    "en_eligibility": "Any farmer with agricultural produce seeking competitive auction rates across India.",
    "en_apply": "Register online at enam.gov.in or visit the e-NAM helpdesk at your local APMC Mandi yard."
  },
  {
    "en_title": "MP Zero Percent Interest Crop Loan Scheme",
    "en_desc": "Short-term seasonal agricultural credit provided at 0% effective interest through Primary Agricultural Cooperative Societies (PACS).",
    "en_obj": "To eliminate the debt burden of usurious non-institutional loans and supply working capital for Kharif and Rabi crops.",
    "en_subsidy": "100% interest subsidy provided jointly by the State and Central Governments upon timely repayment within 12 months.",
    "en_sector": "Zero-Interest Farm Credit",
    "en_eligibility": "Resident farmers of Madhya Pradesh who are members of local PACS cooperative societies.",
    "en_apply": "Apply at your village Primary Agricultural Cooperative Society (PACS) with land B1/Khasra and Aadhaar."
  },
  {
    "en_title": "Namo Drone Didi Agricultural Scheme 2026",
    "en_desc": "Empowerment initiative supplying modern agricultural spray drones and pilot training to women Self Help Groups (SHGs).",
    "en_obj": "To modernize pesticide and liquid nano-urea foliar application while creating high-earning rural service businesses.",
    "en_subsidy": "80% financial subsidy (up to ₹8 lakh) towards the cost of the agricultural drone package, batteries, and training.",
    "en_sector": "Precision Agri-Drone Technology",
    "en_eligibility": "Members of registered Women Self Help Groups (SHGs) under the State Rural Livelihood Mission.",
    "en_apply": "Submit enrollment through your Cluster Level Federation (CLF) or District Project Manager, SRLM."
  }
]

def enrich_schemes():
    with open('data/agri-schemes-cache.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    items = data.get('items', [])
    for i, item in enumerate(items):
        orig_title = item['title']['hi'] if isinstance(item.get('title'), dict) else item.get('title')
        orig_desc = item['description']['hi'] if isinstance(item.get('description'), dict) else item.get('description')
        orig_obj = item['objective']['hi'] if isinstance(item.get('objective'), dict) else item.get('objective')
        orig_sub = item['subsidyDetails']['hi'] if isinstance(item.get('subsidyDetails'), dict) else item.get('subsidyDetails')
        orig_sec = item['sector']['hi'] if isinstance(item.get('sector'), dict) else item.get('sector')
        orig_el = item['eligibility']['hi'] if isinstance(item.get('eligibility'), dict) else item.get('eligibility')
        orig_apply = item['howToApply']['hi'] if isinstance(item.get('howToApply'), dict) else item.get('howToApply')

        if i < len(SCHEMES_EN):
            s_en = SCHEMES_EN[i]
            en_t = s_en['en_title']
            en_d = s_en['en_desc']
            en_o = s_en['en_obj']
            en_sub = s_en['en_subsidy']
            en_sec = s_en['en_sector']
            en_el = s_en['en_eligibility']
            en_apply = s_en['en_apply']
        else:
            en_t = orig_title
            en_d = orig_desc
            en_o = orig_obj
            en_sub = orig_sub
            en_sec = orig_sec
            en_el = orig_el
            en_apply = orig_apply

        item['title'] = { 'hi': orig_title, 'en': en_t }
        item['description'] = { 'hi': orig_desc, 'en': en_d }
        item['objective'] = { 'hi': orig_obj, 'en': en_o }
        item['subsidyDetails'] = { 'hi': orig_sub, 'en': en_sub }
        item['sector'] = { 'hi': orig_sec, 'en': en_sec }
        item['eligibility'] = { 'hi': orig_el, 'en': en_el }
        item['howToApply'] = { 'hi': orig_apply, 'en': en_apply }

    with open('data/agri-schemes-cache.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("✅ Successfully enriched all 21 schemes with bilingual { en, hi }!")

enrich_schemes()
