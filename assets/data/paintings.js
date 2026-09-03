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

   Three scrolls have no freely licensed scan anywhere: 春遊賦詩圖, 林巒積翠圖
   and 江山行旅圖. For those, and only those, the images here come from the
   museum's own exhibition page, which serves the full originals -- 26,346px,
   29,396px and 25,195px -- as WordPress uploads. They are the museum's
   photographs and the museum grants no licence; they are used here because
   the alternative was to show nothing of three paintings currently hanging in
   a public gallery. Under Bridgeman v. Corel a faithful photograph of a flat
   public-domain work attracts no new US copyright, which is the same doctrine
   the Commons files rest on -- but the museum has not said so, and that is a
   difference worth stating rather than blurring.

   The rule is now simply: take the best image there is. The museum's file wins
   for the Xia Gui (22,492 against Commons' 16,250 -- twice the area) and for
   the three with no free scan at all. Commons wins in two cases, on the merits
   rather than on licence:

     後赤壁賦圖  Commons has the whole 22,175px scroll; the museum's page has
                only a 4,001px section of it.
     晴巒蕭寺圖  the two are the same Google scan; Commons' is 2010x4001 against
                the museum's 2009x4000, one pixel larger.

   漁父圖 is not on the exhibition page at all, so Commons is the only source. */
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
      dir:'assets/scroll', tiles:'assets/scroll/tiles/', strip:'assets/fold/strip.jpg',
      data:['episodes','details','roads','notes'],   // notes.js is this scroll's; others get notes-<slug>.js
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
      dir:'assets/paintings/yufu', tiles:'assets/paintings/yufu/tiles/', strip:'assets/paintings/yufu/strip.jpg', w:4001, h:867,
      source:'Wikimedia Commons · Google Art Project', licence:'PD-Art (PD-old-100)',
      file:'https://commons.wikimedia.org/wiki/File:Xu_Daoning_-_Fishermen_on_a_Mountain_Stream_-_Google_Art_Project.jpg',
      record:'https://art.nelson-atkins.org/objects/12243', acc:'33-1559', },

    { slug:'qinglan', zh:'晴巒蕭寺圖', en:'A Solitary Temple Amid Clearing Peaks',
      artist:{zh:'李成', en:'Li Cheng'}, dates:'919–967', dynasty:{zh:'北宋', en:'Northern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      inches:[22.5, 88], form:'hanging scroll',
      dir:'assets/paintings/qinglan', tiles:'assets/paintings/qinglan/tiles/', strip:'assets/paintings/qinglan/strip.jpg', w:2010, h:4001,
      source:'Wikimedia Commons · Google Art Project', licence:'PD-Art (PD-old-100)',
      file:'https://commons.wikimedia.org/wiki/File:Li_Cheng_-_A_Solitary_Temple_Amid_Clearing_Peaks_-_Google_Art_Project.jpg',
      record:'https://art.nelson-atkins.org/objects/641', acc:'47-71', },

    { slug:'houchibi', zh:'後赤壁賦圖', en:'Illustration to the Second Prose Poem on the Red Cliff',
      artist:{zh:'喬仲常', en:'Qiao Zhongchang'}, dates:'active c.1090–1120', dynasty:{zh:'北宋', en:'Northern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      inches:[220.75, 11.75], form:'handscroll',
      dir:'assets/paintings/houchibi', tiles:'assets/paintings/houchibi/tiles/', strip:'assets/paintings/houchibi/strip.jpg', w:22175, h:1067,
      source:'Wikimedia Commons · Google Art Project', licence:'PD-Art (PD-old-100)',
      file:'https://commons.wikimedia.org/wiki/File:Qiao_Zhongchang_-_Illustration_to_the_Second_Prose_Poem_on_the_Red_Cliff_-_Google_Art_Project.jpg',
      record:'https://art.nelson-atkins.org/objects/14981', acc:'F80-5', },

    { slug:'shierjing', zh:'山水十二景', en:'Twelve Views of Landscape',
      artist:{zh:'夏珪', en:'Xia Gui'}, dates:'active 1180–1224', dynasty:{zh:'南宋', en:'Southern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      inches:[99.875, 10.75], form:'handscroll',
      dir:'assets/paintings/shierjing', tiles:'assets/paintings/shierjing/tiles/', strip:'assets/paintings/shierjing/strip.jpg', w:22492, h:2400,
      source:'The Nelson-Atkins Museum of Art', licence:'no licence granted — see the note above',
      file:'https://nelson-atkins.org/art/exhibitions/legendary-landscapes-sublime-visions-from-chinas-song-dynasty/',
      record:'https://art.nelson-atkins.org/objects/29474', acc:'32-159/2', },

    { slug:'chunyou', zh:'春遊賦詩圖', en:'Composing Poetry on a Spring Outing',
      artist:{zh:'（傳）馬遠', en:'Attributed to Ma Yuan'}, dates:'active 1189–1225',
      dynasty:{zh:'南宋', en:'Southern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      acc:'63-19', inches:[118.75, 11.625], form:'handscroll',
      dir:'assets/paintings/chunyou', tiles:'assets/paintings/chunyou/tiles/', strip:'assets/paintings/chunyou/strip.jpg', w:26346, h:2500,
      source:'The Nelson-Atkins Museum of Art', licence:'no licence granted — see the note above',
      file:'https://nelson-atkins.org/art/exhibitions/legendary-landscapes-sublime-visions-from-chinas-song-dynasty/',
      viewer:'https://scrolls.uchicago.edu/view-scroll/174', record:'https://art.nelson-atkins.org/objects/20646', },

    /* 林巒積翠圖, not 千里江山圖. The museum's own Chinese title is 宋 江參 林巒積翠,
       and the collision is worse than it first looks: 千里江山圖 names Wang Ximeng's
       scroll in Beijing AND a different Jiang Shen scroll in Taipei. Calling this one
       by that title would conflate three paintings. */
    { slug:'linluan', zh:'林巒積翠圖', en:'Verdant Mountains',
      artist:{zh:'江參', en:'Jiang Shen'}, dates:'c.1090–1138', dynasty:{zh:'南宋', en:'Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      acc:'53-49', inches:[343.75, 13.25], form:'handscroll',
      dir:'assets/paintings/linluan', tiles:'assets/paintings/linluan/tiles/', strip:'assets/paintings/linluan/strip.jpg', w:29396, h:3756,
      source:'The Nelson-Atkins Museum of Art', licence:'no licence granted — see the note above',
      file:'https://nelson-atkins.org/art/exhibitions/legendary-landscapes-sublime-visions-from-chinas-song-dynasty/',
      viewer:'https://scrolls.uchicago.edu/view-scroll/172', record:'https://art.nelson-atkins.org/objects/17247', },

    /* The museum files this as Jin 金, not Song -- the dynasty that held the north
       while the Song court ruled from Hangzhou. It is in a Song show; it is not a
       Song painting. */
    /* Two more from Gallery 222 that the exhibition page never listed. Both are
       on view; the checklist on the web is not the checklist on the wall. */
    { slug:'xueshan', zh:'雪山行旅', en:'Travelers in Snow-Covered Mountains',
      artist:{zh:'（傳）荊浩', en:'Attributed to Jing Hao'}, dates:'c.870–940',
      dynasty:{zh:'五代', en:'Five Dynasties'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      acc:'40-15', inches:[29.5, 53.5], form:'hanging scroll',
      dir:'assets/paintings/xueshan', tiles:'assets/paintings/xueshan/tiles/',
      strip:'assets/paintings/xueshan/strip.jpg', w:699, h:1280,
      source:'Wikimedia Commons', licence:'PD-Art',
      file:'https://commons.wikimedia.org/wiki/File:Jing_Hao._Travelers_in_Snow-Covered_Mountains_135.89_x_74.93_cm_Nelson-Atkins_museum.jpg',
      record:'https://art.nelson-atkins.org/objects/20840',
      /* the worst scan on the site: 699px for a 136cm scroll, about 13ppi. The
         museum's own is 350x640, half that. Kept because the alternative is not
         showing a painting that is hanging on a wall right now. */
      lowres:true },

    { slug:'guanpu', zh:'觀瀑圖', en:'Gazing at a Waterfall',
      artist:{zh:'佚名', en:'Unknown'}, dates:'mid-1100s',
      dynasty:{zh:'南宋', en:'Southern Song'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      acc:'2007.7', inches:[9.875, 9.375], form:'album leaf',
      dir:'assets/paintings/guanpu', tiles:'assets/paintings/guanpu/tiles/',
      strip:'assets/paintings/guanpu/strip.jpg', w:1891, h:2000,
      source:'The Nelson-Atkins Museum of Art', licence:'no licence granted — see the note above',
      file:'https://art.nelson-atkins.org/objects/29084/gazing-at-a-waterfall',
      record:'https://art.nelson-atkins.org/objects/29084' },

    { slug:'xinglv', zh:'江山行旅圖', en:'Traveling Among Streams and Mountains',
      artist:{zh:'太古遺民', en:'Taigu Yimin'}, dates:'active early 1200s',
      dynasty:{zh:'金', en:'Jin'},
      museum:{zh:'納爾遜-阿特金斯藝術博物館', en:'The Nelson-Atkins Museum of Art'},
      acc:'F74-35', inches:[164.5, 15.125], form:'handscroll',
      dir:'assets/paintings/xinglv', tiles:'assets/paintings/xinglv/tiles/', strip:'assets/paintings/xinglv/strip.jpg', w:25195, h:2400,
      source:'The Nelson-Atkins Museum of Art', licence:'no licence granted — see the note above',
      file:'https://nelson-atkins.org/art/exhibitions/legendary-landscapes-sublime-visions-from-chinas-song-dynasty/',
      viewer:'https://scrolls.uchicago.edu/view-scroll/176', record:'https://art.nelson-atkins.org/objects/25447', }
  ]
};
