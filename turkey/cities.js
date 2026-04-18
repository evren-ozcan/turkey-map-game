const cities = [
  {
    "id": "tr-16",
    "plate": 16,
    "name": "Bursa"
  },
  {
    "id": "tr-09",
    "plate": 9,
    "name": "Aydın"
  },
  {
    "id": "tr-17",
    "plate": 17,
    "name": "Çanakkale"
  },
  {
    "id": "tr-24",
    "plate": 24,
    "name": "Erzincan"
  },
  {
    "id": "tr-81",
    "plate": 81,
    "name": "Düzce"
  },
  {
    "id": "tr-19",
    "plate": 19,
    "name": "Çorum"
  },
  {
    "id": "tr-23",
    "plate": 23,
    "name": "Elazığ"
  },
  {
    "id": "tr-45",
    "plate": 45,
    "name": "Manisa"
  },
  {
    "id": "tr-27",
    "plate": 27,
    "name": "Gaziantep"
  },
  {
    "id": "tr-32",
    "plate": 32,
    "name": "Isparta"
  },
  {
    "id": "tr-22",
    "plate": 22,
    "name": "Edirne"
  },
  {
    "id": "tr-56",
    "plate": 56,
    "name": "Siirt"
  },
  {
    "id": "tr-78",
    "plate": 78,
    "name": "Karabük"
  },
  {
    "id": "tr-53",
    "plate": 53,
    "name": "Rize"
  },
  {
    "id": "tr-65",
    "plate": 65,
    "name": "Van"
  },
  {
    "id": "tr-80",
    "plate": 80,
    "name": "Osmaniye"
  },
  {
    "id": "tr-15",
    "plate": 15,
    "name": "Burdur"
  },
  {
    "id": "tr-30",
    "plate": 30,
    "name": "Hakkâri"
  },
  {
    "id": "tr-13",
    "plate": 13,
    "name": "Bitlis"
  },
  {
    "id": "tr-25",
    "plate": 25,
    "name": "Erzurum"
  },
  {
    "id": "tr-42",
    "plate": 42,
    "name": "Konya"
  },
  {
    "id": "tr-08",
    "plate": 8,
    "name": "Artvin"
  },
  {
    "id": "tr-03",
    "plate": 3,
    "name": "Afyonkarahisar"
  },
  {
    "id": "tr-05",
    "plate": 5,
    "name": "Amasya"
  },
  {
    "id": "tr-52",
    "plate": 52,
    "name": "Ordu"
  },
  {
    "id": "tr-69",
    "plate": 69,
    "name": "Bayburt"
  },
  {
    "id": "tr-29",
    "plate": 29,
    "name": "Gümüşhane"
  },
  {
    "id": "tr-71",
    "plate": 71,
    "name": "Kırıkkale"
  },
  {
    "id": "tr-67",
    "plate": 67,
    "name": "Zonguldak"
  },
  {
    "id": "tr-57",
    "plate": 57,
    "name": "Sinop"
  },
  {
    "id": "tr-20",
    "plate": 20,
    "name": "Denizli"
  },
  {
    "id": "tr-73",
    "plate": 73,
    "name": "Şırnak"
  },
  {
    "id": "tr-47",
    "plate": 47,
    "name": "Mardin"
  },
  {
    "id": "tr-40",
    "plate": 40,
    "name": "Kırşehir"
  },
  {
    "id": "tr-49",
    "plate": 49,
    "name": "Muş"
  },
  {
    "id": "tr-76",
    "plate": 76,
    "name": "Iğdır"
  },
  {
    "id": "tr-06",
    "plate": 6,
    "name": "Ankara"
  },
  {
    "id": "tr-18",
    "plate": 18,
    "name": "Çankırı"
  },
  {
    "id": "tr-34",
    "plate": 34,
    "name": "İstanbul"
  },
  {
    "id": "tr-58",
    "plate": 58,
    "name": "Sivas"
  },
  {
    "id": "tr-62",
    "plate": 62,
    "name": "Tunceli"
  },
  {
    "id": "tr-33",
    "plate": 33,
    "name": "Mersin"
  },
  {
    "id": "tr-74",
    "plate": 74,
    "name": "Bartın"
  },
  {
    "id": "tr-59",
    "plate": 59,
    "name": "Tekirdağ"
  },
  {
    "id": "tr-66",
    "plate": 66,
    "name": "Yozgat"
  },
  {
    "id": "tr-10",
    "plate": 10,
    "name": "Balıkesir"
  },
  {
    "id": "tr-14",
    "plate": 14,
    "name": "Bolu"
  },
  {
    "id": "tr-38",
    "plate": 38,
    "name": "Kayseri"
  },
  {
    "id": "tr-68",
    "plate": 68,
    "name": "Aksaray"
  },
  {
    "id": "tr-12",
    "plate": 12,
    "name": "Bingöl"
  },
  {
    "id": "tr-63",
    "plate": 63,
    "name": "Şanlıurfa"
  },
  {
    "id": "tr-64",
    "plate": 64,
    "name": "Uşak"
  },
  {
    "id": "tr-31",
    "plate": 31,
    "name": "Hatay"
  },
  {
    "id": "tr-37",
    "plate": 37,
    "name": "Kastamonu"
  },
  {
    "id": "tr-11",
    "plate": 11,
    "name": "Bilecik"
  },
  {
    "id": "tr-55",
    "plate": 55,
    "name": "Samsun"
  },
  {
    "id": "tr-61",
    "plate": 61,
    "name": "Trabzon"
  },
  {
    "id": "tr-36",
    "plate": 36,
    "name": "Kars"
  },
  {
    "id": "tr-21",
    "plate": 21,
    "name": "Diyarbakır"
  },
  {
    "id": "tr-54",
    "plate": 54,
    "name": "Sakarya"
  },
  {
    "id": "tr-41",
    "plate": 41,
    "name": "Kocaeli"
  },
  {
    "id": "tr-51",
    "plate": 51,
    "name": "Niğde"
  },
  {
    "id": "tr-43",
    "plate": 43,
    "name": "Kütahya"
  },
  {
    "id": "tr-48",
    "plate": 48,
    "name": "Muğla"
  },
  {
    "id": "tr-04",
    "plate": 4,
    "name": "Ağrı"
  },
  {
    "id": "tr-50",
    "plate": 50,
    "name": "Nevşehir"
  },
  {
    "id": "tr-02",
    "plate": 2,
    "name": "Adıyaman"
  },
  {
    "id": "tr-39",
    "plate": 39,
    "name": "Kırklareli"
  },
  {
    "id": "tr-79",
    "plate": 79,
    "name": "Kilis"
  },
  {
    "id": "tr-77",
    "plate": 77,
    "name": "Yalova"
  },
  {
    "id": "tr-35",
    "plate": 35,
    "name": "İzmir"
  },
  {
    "id": "tr-75",
    "plate": 75,
    "name": "Ardahan"
  },
  {
    "id": "tr-28",
    "plate": 28,
    "name": "Giresun"
  },
  {
    "id": "tr-26",
    "plate": 26,
    "name": "Eskişehir"
  },
  {
    "id": "tr-70",
    "plate": 70,
    "name": "Karaman"
  },
  {
    "id": "tr-01",
    "plate": 1,
    "name": "Adana"
  },
  {
    "id": "tr-07",
    "plate": 7,
    "name": "Antalya"
  },
  {
    "id": "tr-72",
    "plate": 72,
    "name": "Batman"
  },
  {
    "id": "tr-44",
    "plate": 44,
    "name": "Malatya"
  },
  {
    "id": "tr-46",
    "plate": 46,
    "name": "Kahramanmaraş"
  },
  {
    "id": "tr-60",
    "plate": 60,
    "name": "Tokat"
  }
];