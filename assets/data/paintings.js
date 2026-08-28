/* The register of scrolls.

   On images and rights, because this is the part that will otherwise be
   forgotten: the paintings are 800-1000 years old and unquestionably in the
   public domain. The *photographs* of them are a separate question, and the
   answer differs by source.

   - What is hosted here comes from Wikimedia Commons, from files tagged
     PD-Art -- Commons' position, following Bridgeman v. Corel, that a faithful
     photograph of a flat public-domain work carries no new copyright. Each
     entry records the file it came from and the tag it carried.
   - The Nelson-Atkins grants nothing. Its rights page says the user must
     "determine and satisfy copyright or other use restrictions", it runs no
     open-access programme, and its own images of these scrolls are 640-2000px
     -- 640 wide for a 5.6-metre handscroll. Nothing from there is hosted here.
   - The University of Chicago's scroll archive has the best images by far
     (the Red Cliff at 52,797px, twice Commons), but carries a blanket
     copyright notice and no licence. Those are linked, never copied.

   So: three scrolls have no freely licensed scan and are listed with a link
   to where they can actually be seen. That is the honest state of it. */
/* Register. One entry per painting; the viewer reads ?p=<slug>
   and loads that entry's manifest and annotation files. A painting with no
   `dir` is known but not yet digitised -- the cabinet lists it and says so,
   which is more honest than leaving it out and more useful than a dead link. */
window.PAINTINGS = {
  default: 'qianli',
  items: [
    { slug:'qianli', zh:'千里江山圖', en:'A Thousand Li of Rivers and Mountains',
      artist:{zh:'王希孟', en:'Wang Ximeng'}, dates:'1096–1119', dynasty:{zh:'北宋', en:'Northern Song'},
      museum:{zh:'故宮博物院', en:'The Palace Museum, Beijing'},
      dir:'assets/scroll', tiles:'assets/scroll/tiles/',
      data:['episodes','details','roads','notes'],
      w:41783, h:1673 },

    /* The Nelson-Atkins show, Legendary Landscapes: Sublime Visions from
       China's Song Dynasty, Gallery 222, 21 Mar – 27 Sep 2026. All seven are
       from the museum's own collection. Dimensions are the physical work in
       inches, from the museum's checklist -- pixel sizes go in each manifest
       once a usable scan is in hand. */
    { slug:'yufu', zh:'漁父圖', en:"Fishermen's Evening Song",
      artist:{zh:'許道寧', en:'Xu Daoning'}, dates:'970–1052', dynasty:{zh:'北宋', en:'Northern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      inches:[88.5, 19.25], form:'handscroll',
      dir:'assets/paintings/yufu', tiles:'assets/paintings/yufu/tiles/', w:4001, h:867,
      source:'Wikimedia Commons · Google Art Project', licence:'PD-Art (PD-old-100)',
      file:'https://commons.wikimedia.org/wiki/File:Xu_Daoning_-_Fishermen_on_a_Mountain_Stream_-_Google_Art_Project.jpg',
      record:'https://art.nelson-atkins.org/objects/12243', acc:'33-1559', },

    { slug:'qinglan', zh:'晴巒蕭寺圖', en:'A Solitary Temple Amid Clearing Peaks',
      artist:{zh:'李成', en:'Li Cheng'}, dates:'919–967', dynasty:{zh:'北宋', en:'Northern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      inches:[22.5, 88], form:'hanging scroll',
      dir:'assets/paintings/qinglan', tiles:'assets/paintings/qinglan/tiles/', w:2010, h:4001,
      source:'Wikimedia Commons · Google Art Project', licence:'PD-Art (PD-old-100)',
      file:'https://commons.wikimedia.org/wiki/File:Li_Cheng_-_A_Solitary_Temple_Amid_Clearing_Peaks_-_Google_Art_Project.jpg',
      record:'https://art.nelson-atkins.org/objects/641', acc:'47-71', },

    { slug:'houchibi', zh:'後赤壁賦圖', en:'Illustration to the Second Prose Poem on the Red Cliff',
      artist:{zh:'喬仲常', en:'Qiao Zhongchang'}, dates:'active c.1090–1120', dynasty:{zh:'北宋', en:'Northern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      inches:[220.75, 11.75], form:'handscroll',
      dir:'assets/paintings/houchibi', tiles:'assets/paintings/houchibi/tiles/', w:22175, h:1067,
      source:'Wikimedia Commons · Google Art Project', licence:'PD-Art (PD-old-100)',
      file:'https://commons.wikimedia.org/wiki/File:Qiao_Zhongchang_-_Illustration_to_the_Second_Prose_Poem_on_the_Red_Cliff_-_Google_Art_Project.jpg',
      record:'https://art.nelson-atkins.org/objects/14981', acc:'F80-5', },

    { slug:'shierjing', zh:'山水十二景', en:'Twelve Views of Landscape',
      artist:{zh:'夏珪', en:'Xia Gui'}, dates:'active 1180–1224', dynasty:{zh:'南宋', en:'Southern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      inches:[99.875, 10.75], form:'handscroll',
      dir:'assets/paintings/shierjing', tiles:'assets/paintings/shierjing/tiles/', w:16250, h:1601,
      source:'Wikimedia Commons · Google Art Project', licence:'PD-Art (PD-old-100-1923)',
      file:'https://commons.wikimedia.org/wiki/File:Xia_Gui_-_Twelve_Views_of_Landscape_(Shan-shui_shih-erh-ching)_-_Google_Art_Project.jpg',
      record:'https://art.nelson-atkins.org/objects/29474', acc:'32-159/2', },

    { slug:'chunyou', zh:'春遊賦詩圖', en:'Composing Poetry on a Spring Outing',
      artist:{zh:'（傳）馬遠', en:'Attributed to Ma Yuan'}, dates:'active 1189–1225',
      dynasty:{zh:'南宋', en:'Southern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      acc:'63-19', inches:[118.75, 11.625], form:'handscroll',
      viewer:'https://scrolls.uchicago.edu/view-scroll/174', record:'https://art.nelson-atkins.org/objects/20646', },

    /* 林巒積翠圖, not 千里江山圖. The museum's own Chinese title is 宋 江參 林巒積翠,
       and the collision is worse than it first looks: 千里江山圖 names Wang Ximeng's
       scroll in Beijing AND a different Jiang Shen scroll in Taipei. Calling this one
       by that title would conflate three paintings. */
    { slug:'linluan', zh:'林巒積翠圖', en:'Verdant Mountains',
      artist:{zh:'江參', en:'Jiang Shen'}, dates:'c.1090–1138', dynasty:{zh:'南宋', en:'Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      acc:'53-49', inches:[343.75, 13.25], form:'handscroll',
      viewer:'https://scrolls.uchicago.edu/view-scroll/172', record:'https://art.nelson-atkins.org/objects/17247', },

    /* The museum files this as Jin 金, not Song -- the dynasty that held the north
       while the Song court ruled from Hangzhou. It is in a Song show; it is not a
       Song painting. */
    { slug:'xinglv', zh:'江山行旅圖', en:'Traveling Among Streams and Mountains',
      artist:{zh:'太古遺民', en:'Taigu Yimin'}, dates:'active early 1200s',
      dynasty:{zh:'金', en:'Jin'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      acc:'F74-35', inches:[164.5, 15.125], form:'handscroll',
      viewer:'https://scrolls.uchicago.edu/view-scroll/176', record:'https://art.nelson-atkins.org/objects/25447', }
  ]
};
