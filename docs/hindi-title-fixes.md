# Hindi title fixes (2026-10-05)

Seven stored Hindi rows were corrected by hand (no model call). The old rows were backed up first, and each new text
was checked with the same stored-text scan and the translation validator before it was written.

| English | Old | New |
|---|---|---|
| Poultry Farming Scheme (HSFDC) | पoultry फार्मिंग योजना (HSFDC) | पोल्ट्री फार्मिंग योजना (HSFDC) |
| Scheme For Financial Assistance For Veteran Artists | वeteran कलाकारों के लिए वित्तीय सहायता योजना | वरिष्ठ कलाकारों के लिए वित्तीय सहायता योजना |
| National Scholarship For Post Graduate Studies | पост ग्रेजुएट अध्ययन के लिए राष्ट्रीय छात्रवृत्ति | स्नातकोत्तर अध्ययन के लिए राष्ट्रीय छात्रवृत्ति |
| Saraswati Sadhana Yojana to Socially and Educationally Backward Girls studying in Class 9th | सोशल एंड एजुकेशनली बैकवर्ड (सामाजिक और शैक्षणिक रूप से पिछड़ी) कक्षा 9 में पढ़ने वाली लड़कियों के लिए सरस्वती सधना योजना | कक्षा 9 में पढ़ने वाली सामाजिक एवं शैक्षणिक रूप से पिछड़ी बालिकाओं के लिए सरस्वती साधना योजना |
| Various Training and Support Schemes of Kisan Vigyan Kendra - Veer Chandra Singh Garhwali Uttarakhand University of Horticulture and Forestry | किसान विज्ञान केंद्र - वीर चंद्र सिंह गढ़वाली उत्तराखंड कृषि वन विश्वविद्यालय की विभिन्न प्रशिक्षण और सहायता योजनाएँ | किसान विज्ञान केंद्र की विभिन्न प्रशिक्षण एवं सहायता योजनाएँ - वीर चंद्र सिंह गढ़वाली उत्तराखंड औद्यानिकी एवं वानिकी विश्वविद्यालय |
| Alpsankhyak Merit-Cum-Means Chatravriti Yojana (title) | अल्पसंख्यक मेरिट-क्यूम-मीन्स छात्रवृत्ति योजना | अल्पसंख्यक मेरिट-कम-मीन्स छात्रवृत्ति योजना |
| same scheme (summary) | …के अंतर्गत **आल्पांख्यक** मेरिट-कम-मीन्स छात्रवृत्ति योजना… अल्पसंख्यक समुदायों **से संबंधित** प्रतिभाशाली छात्रों… | …के अंतर्गत **अल्पसंख्यक** मेरिट-कम-मीन्स छात्रवृत्ति योजना… अल्पसंख्यक समुदायों **के** प्रतिभाशाली छात्रों… |

(The earlier hand fix "यंत्रांकन" to "यंत्रीकरण" in the Agricultural Mechanization title is also in.)

## Result

Each new text was read against the English: the word order now follows the English, "Veteran" is वरिष्ठ (senior),
"Post Graduate" is स्नातकोत्तर, "Horticulture and Forestry" is औद्यानिकी एवं वानिकी (the earlier text had dropped
Horticulture), and the misspelt "आल्पांख्यक" is gone. `npm run scan:translations -- hi` now finds **0 problem rows out of
5,482** (it found 30 before the clean-up, then 3). The Hindi wording was written by the assistant and has not been
checked by a native speaker.
