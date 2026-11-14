// Seed catalogue: ideas (with materials, steps, substitutes) and community stories.
// A material matches a user's resource when the resource name contains one of its keywords,
// or (if no keyword matches anywhere) when the resource category equals the material category.
// buyCost = estimated PKR to buy it if you don't have it.

const m = (key, name, qty, unit, keywords, category, buyCost, optional = false) =>
  ({ key, name, qty, unit, keywords, category, buyCost, optional });
const s = (title, detail) => ({ title, detail });

export const IDEAS = [
  {
    id: 'jar-herb-garden', title: 'Jar herb garden', category: 'garden', minutes: 45, difficulty: 'Easy',
    summary: 'Turn clean glass jars into a windowsill herb garden.',
    materials: [
      m('jars', 'Glass jars', 3, 'jars', ['jar'], 'Glass', 300),
      m('soil', 'Potting soil', 1, 'bag', ['soil', 'compost'], 'Garden', 120),
      m('seeds', 'Herb seeds', 1, 'packet', ['seed'], 'Garden', 80),
      m('pebbles', 'Pebbles for drainage', 1, 'handful', ['pebble', 'gravel', 'stone'], 'Garden', 0, true),
    ],
    steps: [
      s('Clean and inspect jars', 'Wash jars in warm soapy water. Discard any jar with chips or cracks.'),
      s('Add drainage layer', 'Place 2–3 cm of pebbles in the base so roots do not sit in water.'),
      s('Add growing medium', 'Fill each jar to two-thirds with potting soil and press gently.'),
      s('Plant and label', 'Sow seeds at the depth on the packet, water lightly, and label each jar.'),
    ],
    substitutes: [
      { free: true, for: 'pebbles', use: 'Broken terracotta or bottle caps', why: 'Any small, rigid pieces create the air gap roots need.', safety: 'Never use broken glass as drainage.' },
      { for: 'soil', use: 'Kitchen compost mixed with sand', why: 'Rich, free-draining and free if you compost.', safety: 'Wear gloves when handling compost.' },
    ],
    tags: ['herb', 'herbs', 'grow', 'garden', 'plant', 'kitchen', 'window', 'green'],
    safety: 'Use intact jars only — chipped glass can cut hands while planting.',
  },
  {
    id: 'desk-organiser', title: 'Desk organiser', category: 'home', minutes: 60, difficulty: 'Easy',
    summary: 'A multi-section organiser from cardboard and a jar for pens.',
    materials: [
      m('cardboard', 'Cardboard sheets', 2, 'sheets', ['cardboard', 'carton', 'box'], 'Paper', 60),
      m('jar', 'Glass jar', 1, 'jar', ['jar'], 'Glass', 100),
      m('scissors', 'Scissors or craft knife', 1, 'pair', ['scissor', 'knife', 'cutter', 'tool'], 'Tools', 250),
      m('adhesive', 'Adhesive (glue or tape)', 1, 'tube', ['glue', 'tape', 'adhesive'], 'Custom', 150),
    ],
    steps: [
      s('Measure your desk space', 'Decide the footprint and the compartments you need.'),
      s('Cut the panels', 'Cut a base, two sides and dividers from cardboard.'),
      s('Join the panels', 'Fix panels together; slot the dividers in.'),
      s('Add the pen jar', 'Set the jar in one compartment for pens and scissors.'),
    ],
    substitutes: [
      { free: true, for: 'adhesive', use: 'Interlocking tabs', why: 'Cut slots halfway into each panel so they lock — no extra material required.', safety: 'Cut away from your hands and keep edges blunt.' },
    ],
    tags: ['organize', 'organise', 'desk', 'clutter', 'tidy', 'office', 'study', 'space'],
    safety: 'Cut away from your hands; fold sharp cardboard edges inward.',
  },
  {
    id: 'cardboard-caddy', title: 'Folded cardboard caddy', category: 'home', minutes: 30, difficulty: 'Easy',
    summary: 'A fold-and-slot caddy for desk essentials — no glue needed.',
    materials: [
      m('cardboard', 'Cardboard sheets', 1, 'sheet', ['cardboard', 'carton', 'box'], 'Paper', 30),
      m('scissors', 'Scissors', 1, 'pair', ['scissor', 'knife', 'cutter', 'tool'], 'Tools', 250),
    ],
    steps: [
      s('Mark the template', 'Draw a cross-shaped net: base in the centre, four walls around it.'),
      s('Score the folds', 'Score fold lines with a blunt edge so they bend cleanly.'),
      s('Cut locking slots', 'Cut matching slots at each wall corner.'),
      s('Fold and lock', 'Fold the walls up and slide the slots together.'),
    ],
    substitutes: [],
    tags: ['organize', 'organise', 'desk', 'clutter', 'tidy', 'caddy', 'space'],
    safety: 'Score with a blunt tool, not a blade, to avoid slips.',
  },
  {
    id: 'jar-pen-holder', title: 'Jar pen holder', category: 'home', minutes: 20, difficulty: 'Easy',
    summary: 'Wrap a jar in fabric offcuts for a soft, no-cost pen pot.',
    materials: [
      m('jar', 'Glass jar', 1, 'jar', ['jar'], 'Glass', 100),
      m('fabric', 'Cotton offcuts', 2, 'pieces', ['cotton', 'fabric', 'cloth', 'offcut'], 'Fabric', 80),
      m('band', 'Rubber band or string', 1, 'piece', ['band', 'string', 'twine', 'thread'], 'Custom', 0, true),
    ],
    steps: [
      s('Clean the jar', 'Wash and dry the jar; remove labels.'),
      s('Cut fabric to size', 'Cut a strip slightly taller than the jar and long enough to wrap.'),
      s('Wrap and secure', 'Wrap tightly and tuck or tie the ends.'),
      s('Fill and place', 'Add pens and set it on your desk.'),
    ],
    substitutes: [{ free: true, for: 'band', use: 'Tuck the fabric inside the rim', why: 'Folding over the rim holds the wrap in place.', safety: '' }],
    tags: ['organize', 'organise', 'desk', 'pen', 'clutter', 'tidy'],
    safety: 'Check the rim for chips before use.',
  },
  {
    id: 'joined-tray', title: 'Joined cardboard tray', category: 'home', minutes: 75, difficulty: 'Medium',
    summary: 'A sturdy glued tray with raised edges for papers and gadgets.',
    materials: [
      m('cardboard', 'Cardboard sheets', 3, 'sheets', ['cardboard', 'carton', 'box'], 'Paper', 90),
      m('scissors', 'Scissors or craft knife', 1, 'pair', ['scissor', 'knife', 'cutter', 'tool'], 'Tools', 250),
      m('adhesive', 'Strong glue', 1, 'tube', ['glue', 'adhesive'], 'Custom', 150),
    ],
    steps: [
      s('Laminate the base', 'Glue two sheets with corrugation crossed for strength.'),
      s('Cut the edges', 'Cut four 4 cm strips for raised edges.'),
      s('Glue the edges', 'Glue edges around the base and clamp with books.'),
      s('Let it cure', 'Leave for an hour before use.'),
    ],
    substitutes: [{ free: true, for: 'adhesive', use: 'Paper strips with flour paste', why: 'Flour and water paste is a free, safe wood-free glue.', safety: 'Let it dry fully to avoid mould.' }],
    tags: ['organize', 'organise', 'desk', 'tray', 'clutter', 'tidy', 'office'],
    safety: 'Use glue in a ventilated room.',
  },
  {
    id: 'cable-tidy', title: 'Cable tidy', category: 'tech', minutes: 20, difficulty: 'Easy',
    summary: 'Fabric ties and a cardboard spine keep chargers untangled.',
    materials: [
      m('fabric', 'Cotton offcuts', 3, 'pieces', ['cotton', 'fabric', 'cloth', 'offcut'], 'Fabric', 80),
      m('cardboard', 'Cardboard sheet', 1, 'sheet', ['cardboard', 'carton', 'box'], 'Paper', 30),
      m('cables', 'Cables to organise', 1, 'set', ['cable', 'charger', 'wire', 'usb'], 'Electronics', 0, true),
    ],
    steps: [
      s('Cut fabric ties', 'Cut 3 cm × 20 cm strips from offcuts.'),
      s('Cut a spine', 'Cut a cardboard strip with notches along one edge.'),
      s('Coil each cable', 'Loosely coil each cable and tie with a fabric strip.'),
      s('Slot into the spine', 'Rest each coiled cable in a notch.'),
    ],
    substitutes: [],
    tags: ['cable', 'cables', 'tech', 'organize', 'organise', 'clutter', 'tidy', 'charger', 'wire'],
    safety: 'Do not coil cables tightly; never tidy cables that are hot or damaged.',
  },
  {
    id: 'cardboard-dividers', title: 'Cardboard drawer dividers', category: 'home', minutes: 35, difficulty: 'Easy',
    summary: 'Slot-together dividers that turn a messy drawer into neat sections.',
    materials: [
      m('cardboard', 'Cardboard sheets', 2, 'sheets', ['cardboard', 'carton', 'box'], 'Paper', 60),
      m('scissors', 'Scissors', 1, 'pair', ['scissor', 'knife', 'cutter', 'tool'], 'Tools', 250),
    ],
    steps: [
      s('Measure the drawer', 'Note inside width, depth and height.'),
      s('Cut strips', 'Cut long and short strips to the drawer height.'),
      s('Cut half-slots', 'Cut slots halfway down where strips cross.'),
      s('Assemble in place', 'Slot the grid together inside the drawer.'),
    ],
    substitutes: [],
    tags: ['organize', 'organise', 'drawer', 'clutter', 'tidy', 'space', 'small space'],
    safety: 'Keep fingers clear of the blade line.',
  },
  {
    id: 'fabric-produce-bag', title: 'Fabric produce bag', category: 'food', minutes: 50, difficulty: 'Medium',
    summary: 'Sew offcuts into a reusable bag for fruit, vegetables or bread.',
    materials: [
      m('fabric', 'Cotton offcuts', 4, 'pieces', ['cotton', 'fabric', 'cloth', 'offcut'], 'Fabric', 150),
      m('needle', 'Needle and thread', 1, 'set', ['needle', 'thread', 'sewing', 'tool'], 'Tools', 100),
      m('string', 'Drawstring cord', 1, 'piece', ['string', 'cord', 'lace', 'twine'], 'Custom', 40, true),
    ],
    steps: [
      s('Cut panels', 'Cut two matching rectangles from offcuts.'),
      s('Sew the sides', 'Sew three sides with a simple running stitch.'),
      s('Make a channel', 'Fold the top over 2 cm and stitch to form a channel.'),
      s('Thread the cord', 'Thread a cord through the channel and knot the ends.'),
    ],
    substitutes: [{ free: true, for: 'string', use: 'A strip of offcut fabric', why: 'A rolled fabric strip works as a drawstring.', safety: '' }],
    tags: ['food', 'kitchen', 'bag', 'shopping', 'reduce', 'clutter', 'sew', 'plastic'],
    safety: 'Keep needles in a pincushion; wash before food use.',
  },
  {
    id: 'rice-heat-pack', title: 'Rice heat pack', category: 'food', minutes: 25, difficulty: 'Easy',
    summary: 'A microwaveable heat pack from rice and a cotton offcut.',
    materials: [
      m('rice', 'Uncooked rice', 0.5, 'kg', ['rice'], 'Food', 150),
      m('fabric', 'Cotton offcuts', 2, 'pieces', ['cotton', 'fabric', 'cloth', 'offcut'], 'Fabric', 80),
      m('needle', 'Needle and thread', 1, 'set', ['needle', 'thread', 'sewing', 'tool'], 'Tools', 100),
    ],
    steps: [
      s('Cut a pouch', 'Cut two 20 × 25 cm cotton rectangles (100% cotton only).'),
      s('Sew three sides', 'Sew with small, tight stitches.'),
      s('Fill with rice', 'Fill two-thirds full with dry rice.'),
      s('Close and test', 'Sew shut; heat 30 seconds at a time and test the temperature.'),
    ],
    substitutes: [{ for: 'rice', use: 'Dried lentils', why: 'Dry pulses hold heat the same way.', safety: 'Never use anything that contains moisture.' }],
    tags: ['food', 'comfort', 'warm', 'heat', 'rice', 'sew', 'gift'],
    safety: 'Use only 100% cotton; heat in short bursts and never leave the microwave unattended.',
  },
  {
    id: 'charging-station', title: 'Charging station', category: 'tech', minutes: 40, difficulty: 'Medium',
    summary: 'A cardboard dock that keeps phones and cables in one place.',
    materials: [
      m('cardboard', 'Cardboard sheets', 2, 'sheets', ['cardboard', 'carton', 'box'], 'Paper', 60),
      m('cables', 'USB cables', 2, 'cables', ['cable', 'usb', 'charger'], 'Electronics', 400),
      m('scissors', 'Craft knife', 1, 'piece', ['scissor', 'knife', 'cutter', 'tool'], 'Tools', 250),
    ],
    steps: [
      s('Build the box', 'Fold a shoebox-sized box from cardboard.'),
      s('Cut cable holes', 'Cut holes in the back for each cable.'),
      s('Add phone slots', 'Cut angled slots on top to rest phones.'),
      s('Route cables', 'Feed cables through and plug in the adapters underneath.'),
    ],
    substitutes: [],
    tags: ['tech', 'cable', 'charger', 'phone', 'organize', 'organise', 'clutter'],
    safety: 'Keep chargers ventilated; do not enclose adapters completely.',
  },
  {
    id: 'patch-bag', title: 'Patch a torn bag', category: 'repair', minutes: 30, difficulty: 'Easy',
    summary: 'Mend a ripped bag or jeans with a fabric patch.',
    materials: [
      m('fabric', 'Cotton offcut', 1, 'piece', ['cotton', 'fabric', 'cloth', 'offcut', 'denim'], 'Fabric', 50),
      m('needle', 'Needle and thread', 1, 'set', ['needle', 'thread', 'sewing'], 'Tools', 100),
    ],
    steps: [
      s('Trim the tear', 'Trim loose threads around the hole.'),
      s('Cut a patch', 'Cut a patch 2 cm larger than the hole on every side.'),
      s('Pin in place', 'Pin the patch on the inside.'),
      s('Stitch around', 'Stitch all round with a blanket stitch.'),
    ],
    substitutes: [],
    tags: ['repair', 'mend', 'fix', 'torn', 'bag', 'clothes', 'loose', 'restore'],
    safety: 'Work under good light; keep pins in a dish.',
  },
  {
    id: 'loose-chair', title: 'Tighten a loose chair', category: 'repair', minutes: 30, difficulty: 'Medium',
    summary: 'Fix a wobbly chair joint with basic tools.',
    materials: [
      m('tools', 'Basic tools (screwdriver)', 1, 'set', ['tool', 'screwdriver', 'spanner'], 'Tools', 400),
      m('shim', 'Thin card or wood shim', 1, 'piece', ['cardboard', 'card', 'wood'], 'Paper', 0, true),
    ],
    steps: [
      s('Find the wobble', 'Rock the chair to find which joint moves.'),
      s('Tighten screws', 'Tighten every screw at that joint.'),
      s('Shim worn holes', 'If a screw spins, pack the hole with a sliver of card or wood.'),
      s('Test the chair', 'Sit carefully and rock again.'),
    ],
    substitutes: [],
    tags: ['repair', 'fix', 'loose', 'chair', 'furniture', 'wobble', 'restore', 'item'],
    safety: 'Do not sit on the chair until the joint is firm.',
  },
  {
    id: 'seed-starter-pots', title: 'Cardboard seed-starter pots', category: 'garden', minutes: 30, difficulty: 'Easy',
    summary: 'Biodegradable pots that go straight into the soil.',
    materials: [
      m('cardboard', 'Cardboard or paper', 2, 'sheets', ['cardboard', 'paper', 'carton', 'newspaper'], 'Paper', 0),
      m('soil', 'Potting soil', 1, 'bag', ['soil', 'compost'], 'Garden', 120),
      m('seeds', 'Seeds', 1, 'packet', ['seed'], 'Garden', 80),
    ],
    steps: [
      s('Cut strips', 'Cut 8 cm wide strips of cardboard or paper.'),
      s('Roll pots', 'Roll each strip round a jar and fold the base.'),
      s('Fill and sow', 'Fill with soil and sow one or two seeds.'),
      s('Plant out', 'When seedlings are strong, plant the whole pot.'),
    ],
    substitutes: [],
    tags: ['garden', 'grow', 'seed', 'plant', 'herbs', 'green'],
    safety: 'Avoid glossy printed card — inks can leach into soil.',
  },
  {
    id: 'pantry-jars', title: 'Labelled pantry jars', category: 'food', minutes: 25, difficulty: 'Easy',
    summary: 'Store rice, lentils and spices in labelled jars to reduce clutter and waste.',
    materials: [
      m('jars', 'Glass jars', 4, 'jars', ['jar'], 'Glass', 400),
      m('rice', 'Dry food to store', 1, 'kg', ['rice', 'lentil', 'flour', 'spice'], 'Food', 0, true),
      m('labels', 'Card labels', 1, 'sheet', ['card', 'paper', 'cardboard', 'label'], 'Paper', 0, true),
    ],
    steps: [
      s('Clean and dry jars', 'Wash and dry completely — damp jars spoil food.'),
      s('Cut labels', 'Cut card labels and write contents and date.'),
      s('Fill jars', 'Decant dry food using a funnel made from card.'),
      s('Arrange the shelf', 'Group by use and put oldest at the front.'),
    ],
    substitutes: [],
    tags: ['food', 'kitchen', 'pantry', 'organize', 'organise', 'clutter', 'storage', 'reduce', 'space'],
    safety: 'Jars must be fully dry; check lids seal.',
  },
  {
    id: 'fabric-wall-art', title: 'Patchwork wall art', category: 'art', minutes: 90, difficulty: 'Medium',
    summary: 'Arrange offcuts on cardboard to make a framed patchwork piece.',
    materials: [
      m('fabric', 'Cotton offcuts', 8, 'pieces', ['cotton', 'fabric', 'cloth', 'offcut'], 'Fabric', 200),
      m('cardboard', 'Cardboard backing', 1, 'sheet', ['cardboard', 'carton', 'box'], 'Paper', 30),
      m('adhesive', 'Glue', 1, 'tube', ['glue', 'adhesive'], 'Custom', 150),
    ],
    steps: [
      s('Plan a layout', 'Arrange offcuts on the board until you like the pattern.'),
      s('Trim pieces', 'Trim edges straight for neat joins.'),
      s('Fix in place', 'Glue each piece, working from the centre out.'),
      s('Frame and hang', 'Fold a cardboard border and hang with string.'),
    ],
    substitutes: [{ for: 'adhesive', use: 'Stitch onto a fabric backing', why: 'Sewing pieces avoids glue entirely.', safety: '' }],
    tags: ['art', 'making', 'craft', 'decor', 'wall', 'gift', 'creative'],
    safety: 'Use glue in a ventilated room.',
  },
];

export const STORIES = [
  {
    id: 'shelf-mini-garden', title: 'A shelf becomes a mini garden', author: 'Patchwork Community', category: 'garden', idea_id: 'jar-herb-garden',
    summary: 'Six pasta-sauce jars became a kitchen herb shelf.',
    body: 'Clean jars, a little soil and a packet of coriander seeds turned an empty kitchen shelf into a mini herb garden. The jars were already in the cupboard and the seeds cost less than a bunch of herbs at the market.',
    lesson: 'Inspect glass for chips before planting — one jar had a hairline crack that cut a finger.',
  },
  {
    id: 'cable-chaos', title: 'Ending cable chaos', author: 'Patchwork Community', category: 'tech', idea_id: 'cable-tidy',
    summary: 'Old T-shirt strips tamed a drawer of chargers.',
    body: 'A drawer of tangled chargers was sorted in twenty minutes with strips cut from an old T-shirt and a notched cardboard spine.',
    lesson: 'Label each tie with the device name so you never unwind the wrong cable.',
  },
  {
    id: 'pantry-reset', title: 'A pantry reset with jars', author: 'Patchwork Community', category: 'food', idea_id: 'pantry-jars',
    summary: 'Labelled jars cut food waste in half.',
    body: 'Decanting rice, lentils and spices into labelled jars made it obvious what was running low and what needed using first.',
    lesson: 'Dry jars completely — moisture spoiled the first batch of flour.',
  },
  {
    id: 'desk-in-an-hour', title: 'A tidy desk in an hour', author: 'Patchwork Community', category: 'home', idea_id: 'desk-organiser',
    summary: 'Delivery boxes became a desk organiser.',
    body: 'Two delivery boxes and a jam jar became a desk organiser with slots for notebooks, a phone and pens — joined with interlocking tabs, no glue.',
    lesson: 'Measure twice: the first divider was 1 cm too tall for the shelf above.',
  },
  {
    id: 'mended-tote', title: 'The tote bag that lived again', author: 'Patchwork Community', category: 'repair', idea_id: 'patch-bag',
    summary: 'A colourful patch saved a favourite bag.',
    body: 'A torn tote got a bright cotton patch and a blanket stitch border. It now looks better than new.',
    lesson: 'Patch from the inside so the stitches take the strain, not the fabric edge.',
  },
  {
    id: 'offcut-art', title: 'Offcuts on the wall', author: 'Patchwork Community', category: 'art', idea_id: 'fabric-wall-art',
    summary: 'A box of tailoring scraps became wall art.',
    body: 'Scraps from a tailor were arranged by colour on a cardboard backing to make a striking patchwork piece for the living room.',
    lesson: 'Lay everything out and photograph it before gluing anything.',
  },
];

export const INSPIRATION_CATEGORIES = [
  { key: 'food', title: 'Food & ingredients' },
  { key: 'tech', title: 'Electronics & repair' },
  { key: 'home', title: 'Home improvement' },
  { key: 'garden', title: 'Gardening' },
  { key: 'art', title: 'Art & making' },
  { key: 'repair', title: 'Everyday fixes' },
];
