# Photographs of the paintings, pinned to the paintings

*You stood in front of these last weekend and photographed them. The goal is
that someone clicking a rock on the scroll sees your photograph of that rock.
Written before the photos arrive, so the folders are ready and the decisions
are visible.*

## Where they go

    assets/paintings/<slug>/photos/          the image files, any filename
    assets/paintings/<slug>/photos/photos.json   what each one shows

Nine folders exist, one per work in the show. Filenames off a phone are fine —
the meaning lives in `photos.json`, not in the name.

## The core problem: a photograph is not a rectangle

The obvious model is "this photo is the region x,y,w,h of the scroll". It is
almost right, and wrong in the way that matters. A photograph taken in a
gallery is:

- **not square-on.** You stood to one side of the case; the near edge of the
  painting is larger than the far edge. That is a projective transform, not a
  crop.
- **not the same colour.** Gallery light is warm and dim, the museum's scan is
  balanced. The same silk is two colours.
- **not the same sharpness across the frame**, and often not flat — glass
  reflects, and a handscroll in a case is slightly curved.

So the honest unit is a **homography**: a 3×3 matrix mapping photo pixels to
source pixels. A rectangle is what you get when the matrix happens to be a
scale and a translation, and storing only the rectangle throws away the tilt
that would otherwise let the photo be laid over the painting convincingly.

    { "file":"IMG_4312.jpeg", "w":4032, "h":3024,
      "H":[[a,b,c],[d,e,f],[g,h,1]],        // photo px -> source px
      "box":[x,y,w,h],                       // the source rect it covers, derived
      "ppsp": 3.4,                           // photo px per source px: magnification
      "taken":"2026-08-30T15:12:04",
      "note":"the bridge, from the left" }

`box` is derived from `H`, kept because every cheap operation — is this photo
in view, which photos touch this point — wants a rectangle and not a matrix.

## How the matrix gets found

**Automatically, and then checked.** Both paintings are already here at high
resolution, so this is ordinary image registration:

1. Downscale the photo and the region of the scan to a comparable scale.
2. Detect features in both — SIFT is the right choice; it is in OpenCV's main
   module now that the patent has expired, and it handles the scale change
   between a phone photo and a 22,000px scan better than ORB.
3. Match, then fit a homography with RANSAC.
4. **Report the inlier count and the reprojection error.** A registration with
   nine inliers is a coincidence, not a location.

Step 4 is the one that matters. Silk with repeating texture, and a scroll with
a hundred similar rocks, will produce confident nonsense. The rule should be:
below some inlier threshold the photo stays unplaced, and unplaced photos are
listed for a human to drag into position rather than guessed at.

**The search space needs narrowing.** Matching one photo against a
29,396 × 3,756 scan is slow and invites false matches. Two ways to cut it:

- The photos are in visit order. A photo taken thirty seconds after one placed
  at x=18,000 is almost certainly within a few thousand pixels of it.
- You can say roughly where a photo is — the tracer already knows how to draw
  a box. A rough box first, then registration inside it, is both faster and far
  more reliable than a blind global search.

I would build the rough-box path first. It works on day one, needs no OpenCV,
and gives the automatic path something to be checked against.

## The overlap question

Several photos of the same rock at different magnifications is not a problem to
be resolved but the thing that makes this worth doing: it is how you looked at
the painting. Three defensible policies:

- **Best available.** For a given point and zoom, show the photo whose `ppsp`
  is closest to what the viewer is currently magnifying to. Silent, and always
  gives you the sharpest thing that is not absurdly oversampled.
- **A stack.** Mark the region once; clicking cycles the photos, closest
  magnification first. Honest, and it makes the layering visible.
- **Deepest wins.** Always the highest `ppsp`. Simple, and wrong the moment a
  tight crop of one leaf is offered as the view of a whole grove.

I would ship **best available**, with the stack reachable — the marker showing
"3" when three photos cover a place, the way a footnote shows there is more.

## What not to do

- **Do not colour-correct the photograph to match the scan.** They disagree
  because the light disagreed; that difference is information about the object
  and the room. Correct the *scan* to nothing, and leave the photo alone.
- **Do not warp the photograph into the painting's plane by default.** A
  rectified photo looks like a worse scan. The tilt is evidence that a person
  stood there. Warp only when the intent is explicitly overlay-and-compare.
- **Do not strip EXIF before registration** — the timestamp orders the visit
  and the focal length bounds the magnification — **and do not publish it.**
  Phone EXIF carries GPS, and these were taken at a location that is yours.

## Rights, which are simple here for once

These are **your photographs**. The Nelson-Atkins permits photography for
personal use in its galleries, and the paintings are centuries out of
copyright, so no one else has a claim on them. Worth stating plainly in the
register alongside each photo set: `source:'photographed by the author'`.
That is a stronger position than anything else on this site.

## The order I would build it

1. **Folders and a schema** — done, this document and the nine directories.
2. **A place-a-photo mode in the tracer.** Draw a box, pick a file, write
   `photos.json`. No maths, no dependencies, works the day the photos land.
3. **A photos overlay in the viewer.** Marked regions; click for a lightbox.
   Read-only, no backend.
4. **Registration** with OpenCV as an offline tool, seeded by the rough boxes
   from step 2 and reporting its own confidence.
5. **Overlay and compare** — the same rock, scan and photograph, fading between
   them. This is the one that will actually be striking, and it depends on
   every step above being right.
