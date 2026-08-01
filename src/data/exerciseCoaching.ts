/**
 * Centralised coaching metadata for the built-in exercise library.
 *
 * Keyed by `coachingKey(name)` (lower-case, whitespace/hyphen normalised) so it
 * matches the seeded exercise names in supabase/migrations/0003_seed_exercises.sql.
 *
 * This module is loaded on demand by `src/lib/coaching.ts` — import it through
 * `loadCoachingLibrary()` rather than statically, so it stays in its own chunk.
 * Custom (user-created) exercises intentionally have no entry; the UI falls back
 * to "No coaching information available."
 */

import type { CoachingLibrary } from '@/lib/coaching';

export const EXERCISE_COACHING: CoachingLibrary = {
  // ------------------------------------------------------------------ chest
  'chest press': {
    posture: [
      'Set the seat so the handles line up with mid-chest.',
      'Keep your shoulder blades pulled back and down against the pad.',
      'Plant both feet flat on the floor.',
      'Press until the arms are extended but the elbows stay soft.',
      'Return under control until you feel a light stretch across the chest.',
    ],
    breathing: ['Inhale as the handles come back toward your chest.', 'Exhale as you press away.'],
    mistakes: [
      'Letting the shoulders round forward off the pad',
      'Locking out the elbows hard at the top',
      'Flaring the elbows to 90° from the torso',
      'Bouncing the weight stack at the bottom',
    ],
    muscles: {
      primary: ['Pectoralis major', 'Anterior deltoids'],
      secondary: ['Triceps', 'Serratus anterior'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'incline chest press': {
    posture: [
      'Align the handles with the upper chest, just below the collarbone.',
      'Keep your head, upper back and hips in contact with the pad.',
      'Tuck the elbows to roughly 45° from the torso.',
      'Press up and slightly inward along the incline path.',
      'Control the descent — do not let the stack pull you.',
    ],
    breathing: ['Inhale on the way down.', 'Exhale as you drive the handles up.'],
    mistakes: [
      'Setting the seat too low, turning it into a shoulder press',
      'Arching the lower back off the pad',
      'Shrugging the shoulders toward the ears',
      'Cutting the range of motion short at the bottom',
    ],
    muscles: {
      primary: ['Upper pectoralis major', 'Anterior deltoids'],
      secondary: ['Triceps', 'Serratus anterior'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'decline chest press': {
    posture: [
      'Sit tall with the handles level with the lower chest.',
      'Keep the shoulder blades retracted and pinned to the pad.',
      'Keep a slight tuck in the elbows throughout.',
      'Press forward and slightly down along the decline path.',
      'Stop the return when the hands reach chest depth.',
    ],
    breathing: ['Inhale as the handles travel back.', 'Exhale as you press forward.'],
    mistakes: [
      'Pushing with the neck and head off the pad',
      'Over-extending the elbows at lockout',
      'Letting the hands drift too far behind the torso',
      'Using momentum from the legs',
    ],
    muscles: {
      primary: ['Lower pectoralis major'],
      secondary: ['Triceps', 'Anterior deltoids'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'pec deck': {
    posture: [
      'Set the seat so your upper arms are level with your shoulders.',
      'Keep your back flat against the pad the whole set.',
      'Maintain a fixed, slightly bent elbow angle.',
      'Bring the pads together in front of the sternum, not the chin.',
      'Open only to a comfortable stretch — avoid forcing the shoulders back.',
    ],
    breathing: ['Inhale as the arms open.', 'Exhale as you squeeze the pads together.'],
    mistakes: [
      'Changing the elbow angle and turning it into a press',
      'Over-stretching at the open position',
      'Shrugging the shoulders up during the squeeze',
      'Slamming the pads together with momentum',
    ],
    muscles: {
      primary: ['Pectoralis major'],
      secondary: ['Anterior deltoids'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'cable fly': {
    posture: [
      'Stagger your stance and brace your core for a stable base.',
      'Set a soft, fixed bend in the elbows and keep it there.',
      'Lead with the elbows and sweep the hands together in an arc.',
      'Keep the shoulders down and away from the ears.',
      'Let the hands travel just past each other for a full squeeze.',
    ],
    breathing: ['Inhale as the cables pull your arms open.', 'Exhale as you bring them together.'],
    mistakes: [
      'Bending and straightening the elbows (pressing instead of flying)',
      'Letting the torso rock forward and back',
      'Setting the pulleys so high the movement becomes a pulldown',
      'Going too heavy and losing control at the stretch',
    ],
    muscles: {
      primary: ['Pectoralis major'],
      secondary: ['Anterior deltoids', 'Biceps (stabiliser)'],
    },
    equipment: 'cable',
    difficulty: 'intermediate',
  },

  // -------------------------------------------------------------- shoulders
  'shoulder press': {
    posture: [
      'Set the seat so the handles start at ear height.',
      'Keep your lower back against the pad and your core braced.',
      'Press straight up without letting the elbows flare behind you.',
      'Stop just short of a hard elbow lockout.',
      'Lower until the upper arms reach roughly shoulder level.',
    ],
    breathing: ['Inhale as you lower the handles.', 'Exhale as you press overhead.'],
    mistakes: [
      'Arching the lower back off the pad to move more weight',
      'Shrugging the traps at the top of the press',
      'Dropping the handles too low and straining the shoulder',
      'Pressing the head forward through the arms',
    ],
    muscles: {
      primary: ['Anterior deltoids', 'Lateral deltoids'],
      secondary: ['Triceps', 'Upper trapezius'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'lateral raise': {
    posture: [
      'Stand tall with a slight forward lean from the hips.',
      'Keep a soft bend in the elbows and hold it constant.',
      'Lead with the elbows, not the hands.',
      'Raise to shoulder height — no higher.',
      'Lower slowly over two to three seconds.',
    ],
    breathing: ['Inhale as you lower the weights.', 'Exhale as you raise them.'],
    mistakes: [
      'Swinging the weights up with hip drive',
      'Shrugging the traps instead of using the delts',
      'Raising above shoulder height',
      'Letting the weights free-fall on the way down',
    ],
    muscles: {
      primary: ['Lateral deltoids'],
      secondary: ['Anterior deltoids', 'Upper trapezius'],
    },
    equipment: 'free_weight',
    difficulty: 'beginner',
  },
  'rear delt fly': {
    posture: [
      'Set the chest pad so your arms line up with your shoulders.',
      'Keep the chest against the pad and the neck neutral.',
      'Hold a fixed, slightly bent elbow position.',
      'Pull the handles apart and back, squeezing the rear delts.',
      'Return under control without letting the stack rest.',
    ],
    breathing: ['Inhale as the handles come forward.', 'Exhale as you pull them apart.'],
    mistakes: [
      'Pulling with the biceps by bending the elbows',
      'Rocking the torso off the chest pad',
      'Squeezing the shoulder blades instead of moving the arms',
      'Loading too heavy and shortening the range',
    ],
    muscles: {
      primary: ['Posterior deltoids'],
      secondary: ['Rhomboids', 'Middle trapezius'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },

  // ------------------------------------------------------------------- back
  'lat pulldown': {
    posture: [
      'Lock your thighs under the pads so you stay seated.',
      'Keep the chest up and lean back no more than about 15°.',
      'Start each rep by depressing the shoulder blades.',
      'Pull the bar to the upper chest, elbows driving down.',
      'Let the bar rise all the way up for a full lat stretch.',
    ],
    breathing: ['Inhale as the bar rises.', 'Exhale as you pull the bar down.'],
    mistakes: [
      'Leaning back excessively and turning it into a row',
      'Pulling the bar behind the neck',
      'Yanking with the biceps and neglecting the lats',
      'Cutting the top of the rep short',
    ],
    muscles: {
      primary: ['Latissimus dorsi'],
      secondary: ['Biceps', 'Rhomboids', 'Posterior deltoids'],
    },
    equipment: 'cable',
    difficulty: 'beginner',
  },
  'wide grip pulldown': {
    posture: [
      'Grip the bar wider than shoulder width, thumbs over the bar.',
      'Secure your thighs under the pads and sit tall.',
      'Drive the elbows straight down toward your ribs.',
      'Touch the bar to the upper chest, chest lifted to meet it.',
      'Control the bar back to full extension every rep.',
    ],
    breathing: ['Inhale on the way up.', 'Exhale as you pull down.'],
    mistakes: [
      'Gripping so wide the range of motion collapses',
      'Swinging the torso to generate momentum',
      'Rounding the upper back at the bottom',
      'Letting the shoulders shrug at the top',
    ],
    muscles: {
      primary: ['Latissimus dorsi', 'Teres major'],
      secondary: ['Biceps', 'Rhomboids'],
    },
    equipment: 'cable',
    difficulty: 'beginner',
  },
  'close grip pulldown': {
    posture: [
      'Use a narrow or V-handle grip with palms facing each other.',
      'Sit upright with the thighs locked and core braced.',
      'Pull the handle to the sternum, elbows tight to the body.',
      'Squeeze the lats for a beat at the bottom.',
      'Extend fully at the top before the next rep.',
    ],
    breathing: ['Inhale as the handle travels up.', 'Exhale as you pull to the chest.'],
    mistakes: [
      'Over-rowing by leaning far back',
      'Letting the biceps take over the pull',
      'Shortening the top of the range',
      'Jerking the stack off the bottom',
    ],
    muscles: {
      primary: ['Latissimus dorsi'],
      secondary: ['Biceps', 'Brachialis', 'Lower trapezius'],
    },
    equipment: 'cable',
    difficulty: 'beginner',
  },
  'seated cable row': {
    posture: [
      'Sit tall with a slight knee bend and a neutral spine.',
      'Keep the chest up and the shoulders down throughout.',
      'Pull the handle to the lower ribs, elbows close to the body.',
      'Squeeze the shoulder blades together at the finish.',
      'Let the arms extend fully without rounding the lower back.',
    ],
    breathing: ['Inhale as the handle travels forward.', 'Exhale as you row to your ribs.'],
    mistakes: [
      'Rocking the torso back and forth for momentum',
      'Rounding the lower back at the stretch',
      'Shrugging the shoulders during the pull',
      'Flaring the elbows out wide',
    ],
    muscles: {
      primary: ['Latissimus dorsi', 'Rhomboids', 'Middle trapezius'],
      secondary: ['Biceps', 'Posterior deltoids', 'Erector spinae'],
    },
    equipment: 'cable',
    difficulty: 'beginner',
  },
  'machine row': {
    posture: [
      'Adjust the seat so the handles sit at mid-torso height.',
      'Keep the chest tall and the core braced against the pad.',
      'Initiate the pull with the shoulder blades, then the elbows.',
      'Drive the elbows back past the ribs.',
      'Return the handles slowly to a full stretch.',
    ],
    breathing: ['Inhale as the handles move away.', 'Exhale as you pull them back.'],
    mistakes: [
      'Leaning the torso back to finish the rep',
      'Letting the shoulders roll forward at the stretch',
      'Pulling with the arms only',
      'Resting the stack between reps',
    ],
    muscles: {
      primary: ['Latissimus dorsi', 'Rhomboids'],
      secondary: ['Biceps', 'Posterior deltoids', 'Middle trapezius'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'chest supported row': {
    posture: [
      'Set the chest pad so your arms hang freely without touching the floor.',
      'Keep the chest pressed into the pad for the whole set.',
      'Start with the shoulder blades protracted, then retract to pull.',
      'Drive the elbows back and slightly down.',
      'Keep the neck neutral — do not crane it up.',
    ],
    breathing: ['Inhale as the arms extend.', 'Exhale as you row.'],
    mistakes: [
      'Peeling the chest off the pad to cheat the weight up',
      'Jerking the first inch of the pull',
      'Flaring the elbows straight out to the sides',
      'Missing the squeeze at the top of the row',
    ],
    muscles: {
      primary: ['Rhomboids', 'Middle trapezius', 'Latissimus dorsi'],
      secondary: ['Biceps', 'Posterior deltoids'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'assisted pull up': {
    posture: [
      'Set the assistance so the last two reps are genuinely difficult.',
      'Grip slightly wider than shoulder width and hang tall.',
      'Pull the shoulder blades down before bending the arms.',
      'Drive the elbows down and back until the chin clears the bar.',
      'Lower under control to a full hang each rep.',
    ],
    breathing: ['Inhale at the bottom of the hang.', 'Exhale as you pull yourself up.'],
    mistakes: [
      'Kipping or bouncing off the assist pad',
      'Stopping short of a full hang at the bottom',
      'Shrugging the shoulders toward the ears',
      'Using so much assistance the lats never work',
    ],
    muscles: {
      primary: ['Latissimus dorsi', 'Teres major'],
      secondary: ['Biceps', 'Rhomboids', 'Core'],
    },
    equipment: 'machine',
    difficulty: 'intermediate',
  },

  // ----------------------------------------------------------------- biceps
  'cable curl': {
    posture: [
      'Stand a step back from the pulley with a braced core.',
      'Keep the elbows pinned at your sides for the whole rep.',
      'Curl the bar up by flexing only at the elbow.',
      'Squeeze at the top without letting the elbows drift forward.',
      'Lower slowly to full arm extension.',
    ],
    breathing: ['Inhale as you lower the bar.', 'Exhale as you curl it up.'],
    mistakes: [
      'Swinging the torso to start the curl',
      'Letting the elbows travel forward at the top',
      'Cutting the bottom of the range short',
      'Dropping the weight instead of controlling it down',
    ],
    muscles: {
      primary: ['Biceps brachii'],
      secondary: ['Brachialis', 'Brachioradialis', 'Forearm flexors'],
    },
    equipment: 'cable',
    difficulty: 'beginner',
  },
  'machine curl': {
    posture: [
      'Set the seat so your upper arms rest flat on the pad.',
      'Keep the armpits snug against the top of the pad.',
      'Grip the handles evenly with wrists neutral.',
      'Curl until the forearms are just short of vertical.',
      'Lower to a controlled, near-full extension.',
    ],
    breathing: ['Inhale on the way down.', 'Exhale as you curl.'],
    mistakes: [
      'Lifting the elbows off the pad',
      'Bending the wrists to help move the load',
      'Letting the stack slam at the bottom',
      'Leaning back to muscle the weight up',
    ],
    muscles: {
      primary: ['Biceps brachii'],
      secondary: ['Brachialis', 'Forearm flexors'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'preacher curl': {
    posture: [
      'Set the seat so your armpits sit at the top edge of the pad.',
      'Keep both upper arms flat on the pad the entire set.',
      'Curl smoothly without leaning back.',
      'Stop just before the forearms reach vertical to keep tension.',
      'Extend slowly — the bottom is where the biceps are most vulnerable.',
    ],
    breathing: ['Inhale as you lower.', 'Exhale as you curl up.'],
    mistakes: [
      'Snapping into a hard lockout at the bottom',
      'Lifting the elbows off the pad',
      'Rising off the seat to finish a rep',
      'Using a weight that forces a partial range',
    ],
    muscles: {
      primary: ['Biceps brachii (short head)'],
      secondary: ['Brachialis', 'Brachioradialis'],
    },
    equipment: 'machine',
    difficulty: 'intermediate',
  },
  'hammer curl': {
    posture: [
      'Stand tall with the dumbbells at your sides, palms facing in.',
      'Keep a neutral grip throughout — thumbs stay up.',
      'Pin the elbows to your ribs and curl.',
      'Keep the wrists straight and firm.',
      'Lower under control to a full stretch.',
    ],
    breathing: ['Inhale as you lower the dumbbells.', 'Exhale as you curl.'],
    mistakes: [
      'Swinging the weights with the hips and lower back',
      'Rotating the wrists into a supinated curl',
      'Letting the elbows drift forward',
      'Rushing the eccentric',
    ],
    muscles: {
      primary: ['Brachialis', 'Brachioradialis'],
      secondary: ['Biceps brachii', 'Forearm flexors'],
    },
    equipment: 'free_weight',
    difficulty: 'beginner',
  },

  // ---------------------------------------------------------------- triceps
  'tricep pushdown': {
    posture: [
      'Stand close to the pulley with a slight forward lean.',
      'Keep the elbows tucked against your ribs and still.',
      'Extend the elbows fully without locking hard.',
      'Keep the wrists neutral and the shoulders down.',
      'Let the bar return only to about 90° of elbow bend.',
    ],
    breathing: ['Inhale as the bar rises.', 'Exhale as you push down.'],
    mistakes: [
      'Letting the elbows flare away from the body',
      'Leaning body weight onto the bar',
      'Shrugging the shoulders at the bottom',
      'Bending the wrists to finish the rep',
    ],
    muscles: {
      primary: ['Triceps brachii (lateral and medial heads)'],
      secondary: ['Anconeus', 'Forearm extensors'],
    },
    equipment: 'cable',
    difficulty: 'beginner',
  },
  'overhead cable extension': {
    posture: [
      'Face away from the pulley with a staggered stance.',
      'Keep the upper arms alongside your head and fixed.',
      'Brace the core so the ribs do not flare.',
      'Extend the elbows until the arms are straight overhead.',
      'Lower to a deep stretch without letting the elbows drop wide.',
    ],
    breathing: ['Inhale as the hands lower behind your head.', 'Exhale as you extend.'],
    mistakes: [
      'Arching the lower back to press the weight',
      'Letting the elbows flare out to the sides',
      'Moving the upper arms instead of only the forearms',
      'Going too heavy and losing the overhead position',
    ],
    muscles: {
      primary: ['Triceps brachii (long head)'],
      secondary: ['Triceps (lateral head)', 'Core'],
    },
    equipment: 'cable',
    difficulty: 'intermediate',
  },
  'dip machine': {
    posture: [
      'Set the seat so the handles sit level with your lower chest.',
      'Sit tall with the chest up and shoulders pulled back.',
      'Keep the elbows tracking close to the torso.',
      'Press down to near-full extension without slamming the joint.',
      'Return until the upper arms are roughly parallel to the floor.',
    ],
    breathing: ['Inhale as the handles rise.', 'Exhale as you press down.'],
    mistakes: [
      'Rounding the shoulders forward under load',
      'Flaring the elbows wide',
      'Dropping too deep and stressing the shoulder',
      'Bouncing out of the bottom position',
    ],
    muscles: {
      primary: ['Triceps brachii'],
      secondary: ['Lower pectoralis major', 'Anterior deltoids'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },

  // ------------------------------------------------------------------- legs
  'leg press': {
    posture: [
      'Keep your lower back against the pad.',
      'Push through your heels.',
      'Avoid locking your knees.',
      'Maintain controlled movement.',
      'Keep knees aligned with toes.',
    ],
    breathing: ['Inhale while lowering the weight.', 'Exhale while pushing the weight upward.'],
    mistakes: [
      'Locking the knees',
      'Lifting the hips off the seat',
      'Using momentum',
      'Rounding the back',
    ],
    muscles: {
      primary: ['Quadriceps', 'Glutes'],
      secondary: ['Hamstrings', 'Calves'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'hack squat': {
    posture: [
      'Set the feet shoulder-width and mid-platform.',
      'Keep the whole back and hips flat against the pad.',
      'Brace the core before releasing the safeties.',
      'Descend until the thighs are at least parallel.',
      'Drive up through the whole foot, knees tracking over the toes.',
    ],
    breathing: ['Inhale at the top and as you descend.', 'Exhale as you drive out of the bottom.'],
    mistakes: [
      'Letting the hips round off the pad at depth',
      'Letting the knees cave inward',
      'Rising onto the toes on the way up',
      'Bouncing out of the bottom position',
    ],
    muscles: {
      primary: ['Quadriceps'],
      secondary: ['Glutes', 'Hamstrings', 'Adductors'],
    },
    equipment: 'machine',
    difficulty: 'intermediate',
  },
  'smith squat': {
    posture: [
      'Position the bar across the upper traps, not the neck.',
      'Set the feet slightly forward of the bar path.',
      'Brace the core and keep the chest up.',
      'Descend to at least parallel with the knees tracking outward.',
      'Drive up evenly through both feet.',
    ],
    breathing: ['Inhale at the top and hold the brace as you descend.', 'Exhale on the way up.'],
    mistakes: [
      'Placing the feet directly under the bar and straining the knees',
      'Letting the heels lift off the floor',
      'Rounding the lower back at depth',
      'Relying on the rails instead of bracing',
    ],
    muscles: {
      primary: ['Quadriceps', 'Glutes'],
      secondary: ['Hamstrings', 'Erector spinae', 'Adductors'],
    },
    equipment: 'machine',
    difficulty: 'intermediate',
  },
  'leg extension': {
    posture: [
      'Align the knee joint with the machine pivot.',
      'Set the ankle pad just above the shoe line.',
      'Keep the lower back and hips against the seat.',
      'Extend smoothly and pause briefly at the top.',
      'Lower under control without letting the stack drop.',
    ],
    breathing: ['Inhale as you lower.', 'Exhale as you extend the knees.'],
    mistakes: [
      'Swinging the legs up with momentum',
      'Lifting the hips off the seat at lockout',
      'Setting the pad too high on the shin',
      'Hyperextending the knees aggressively at the top',
    ],
    muscles: {
      primary: ['Quadriceps'],
      secondary: ['Hip flexors'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'leg curl': {
    posture: [
      'Line the knee joint up with the machine pivot.',
      'Keep the hips pressed into the pad.',
      'Set the ankle pad just above the heels.',
      'Curl until the hamstrings are fully shortened.',
      'Return slowly to a controlled near-full extension.',
    ],
    breathing: ['Inhale as the legs straighten.', 'Exhale as you curl.'],
    mistakes: [
      'Lifting the hips to help the curl',
      'Pointing the toes and cramping the calves',
      'Letting the weight snap back at the end of the rep',
      'Using a partial range at the top',
    ],
    muscles: {
      primary: ['Hamstrings'],
      secondary: ['Calves', 'Glutes'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'romanian deadlift': {
    posture: [
      'Stand with feet hip-width, knees softly bent and fixed.',
      'Brace the core and set the shoulder blades back.',
      'Hinge at the hips, pushing them straight back.',
      'Keep the bar or dumbbells tracking close to the legs.',
      'Stop when the hamstrings reach their stretch, then drive the hips forward.',
    ],
    breathing: ['Inhale and brace at the top.', 'Exhale as you stand tall at lockout.'],
    mistakes: [
      'Rounding the lower back at the bottom',
      'Turning it into a squat by bending the knees',
      'Letting the bar drift away from the body',
      'Hyperextending the lower back at lockout',
    ],
    muscles: {
      primary: ['Hamstrings', 'Glutes'],
      secondary: ['Erector spinae', 'Forearm grip', 'Latissimus dorsi'],
    },
    equipment: 'free_weight',
    difficulty: 'advanced',
  },
  'standing calf raise': {
    posture: [
      'Place the balls of the feet on the platform edge.',
      'Stand tall with the knees nearly straight.',
      'Keep the shoulders under the pads and the core braced.',
      'Rise onto the toes as high as possible.',
      'Lower to a deep, controlled stretch below the platform.',
    ],
    breathing: ['Inhale as the heels drop.', 'Exhale as you rise onto the toes.'],
    mistakes: [
      'Bouncing through the stretch at the bottom',
      'Bending the knees to bounce the weight up',
      'Using a short, partial range',
      'Letting the ankles roll outward',
    ],
    muscles: {
      primary: ['Gastrocnemius'],
      secondary: ['Soleus', 'Tibialis posterior'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'seated calf raise': {
    posture: [
      'Set the knee pad snugly over the lower thighs.',
      'Place the balls of the feet on the platform edge.',
      'Keep the torso upright and relaxed.',
      'Press up as high as the ankles allow.',
      'Lower to a full stretch and pause for a beat.',
    ],
    breathing: ['Inhale as the heels lower.', 'Exhale as you press up.'],
    mistakes: [
      'Bouncing rapidly through partial reps',
      'Pushing with the hands on the knee pad',
      'Cutting the stretch short at the bottom',
      'Letting the feet slide off the platform',
    ],
    muscles: {
      primary: ['Soleus'],
      secondary: ['Gastrocnemius'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'hip abductor': {
    posture: [
      'Sit fully back with the lower back against the pad.',
      'Set the pads against the outside of the knees.',
      'Keep the feet flat and the torso upright.',
      'Push the knees apart smoothly to the end range.',
      'Return under control without letting the stack rest.',
    ],
    breathing: ['Inhale as the knees come together.', 'Exhale as you push them apart.'],
    mistakes: [
      'Leaning the torso back to gain leverage',
      'Snapping the legs open with momentum',
      'Letting the stack slam on the return',
      'Gripping the handles hard enough to tense the neck',
    ],
    muscles: {
      primary: ['Gluteus medius', 'Gluteus minimus'],
      secondary: ['Tensor fasciae latae', 'Gluteus maximus (upper fibres)'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'hip adductor': {
    posture: [
      'Sit tall with the lower back flat against the pad.',
      'Set the starting width to a comfortable stretch, not a maximal one.',
      'Keep the feet flat and the knees tracking with the pads.',
      'Squeeze the knees together under control.',
      'Open slowly back to the start position.',
    ],
    breathing: ['Inhale as the legs open.', 'Exhale as you squeeze them together.'],
    mistakes: [
      'Starting from an aggressive stretch position',
      'Letting the legs fly open on the return',
      'Rounding the lower back off the pad',
      'Using the hands on the knees to assist',
    ],
    muscles: {
      primary: ['Adductor magnus', 'Adductor longus', 'Adductor brevis'],
      secondary: ['Gracilis', 'Pectineus'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'glute kickback': {
    posture: [
      'Set the pad against the middle of the working foot or thigh.',
      'Keep the hips square to the machine.',
      'Brace the core so the lower back does not arch.',
      'Drive the leg back by squeezing the glute.',
      'Return slowly to the start without swinging.',
    ],
    breathing: ['Inhale as the leg returns.', 'Exhale as you kick back.'],
    mistakes: [
      'Arching the lower back to extend further',
      'Rotating the hips open at the top',
      'Using momentum to swing the leg',
      'Rushing the return and losing tension',
    ],
    muscles: {
      primary: ['Gluteus maximus'],
      secondary: ['Hamstrings', 'Erector spinae'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },

  // ------------------------------------------------------------------- core
  'cable crunch': {
    posture: [
      'Kneel below a high pulley with the rope beside your head.',
      'Hinge slightly forward and set the hips in place.',
      'Curl the spine down, bringing the ribs toward the pelvis.',
      'Keep the hips still — the movement is spinal flexion.',
      'Return under control to a tall kneeling stretch.',
    ],
    breathing: ['Inhale as you rise back up.', 'Exhale hard as you crunch down.'],
    mistakes: [
      'Turning the rep into a hip hinge instead of a crunch',
      'Pulling with the arms and shoulders',
      'Letting the hips shift backward each rep',
      'Yanking the rope with momentum',
    ],
    muscles: {
      primary: ['Rectus abdominis'],
      secondary: ['Obliques', 'Hip flexors'],
    },
    equipment: 'cable',
    difficulty: 'intermediate',
  },
  'ab crunch machine': {
    posture: [
      'Align the pivot point with your waist or lower ribs.',
      'Keep the lower back in contact with the seat.',
      'Curl the torso by shortening the abs, not pulling with the arms.',
      'Pause briefly at peak contraction.',
      'Return slowly without letting the stack touch down.',
    ],
    breathing: ['Inhale as you return to the start.', 'Exhale as you crunch forward.'],
    mistakes: [
      'Pulling on the handles with the arms',
      'Using the hip flexors by driving with the legs',
      'Rushing through partial reps',
      'Straining the neck forward',
    ],
    muscles: {
      primary: ['Rectus abdominis'],
      secondary: ['Obliques'],
    },
    equipment: 'machine',
    difficulty: 'beginner',
  },
  'hanging leg raise': {
    posture: [
      'Hang from the bar with the shoulders actively pulled down.',
      'Brace the core and posteriorly tilt the pelvis before lifting.',
      'Raise the legs with control, leading with the pelvis.',
      'Stop when the hips stop rotating, not when the legs stop rising.',
      'Lower slowly to a still hang — no swinging.',
    ],
    breathing: ['Inhale at the bottom of the hang.', 'Exhale as you raise the legs.'],
    mistakes: [
      'Swinging the body to generate momentum',
      'Only lifting the legs without tilting the pelvis',
      'Hanging passively with loose shoulders',
      'Dropping the legs quickly on the way down',
    ],
    muscles: {
      primary: ['Rectus abdominis', 'Hip flexors'],
      secondary: ['Obliques', 'Forearm grip', 'Latissimus dorsi'],
    },
    equipment: 'bodyweight',
    difficulty: 'advanced',
  },
  plank: {
    posture: [
      'Stack the elbows directly under the shoulders.',
      'Keep a straight line from the ears through the heels.',
      'Tuck the pelvis slightly and squeeze the glutes.',
      'Press the forearms into the floor to spread the shoulder blades.',
      'Keep the neck neutral, eyes down at the floor.',
    ],
    breathing: ['Breathe steadily through the nose.', 'Do not hold your breath while bracing.'],
    mistakes: [
      'Letting the hips sag toward the floor',
      'Piking the hips up into an inverted V',
      'Holding the breath for the whole set',
      'Craning the neck up to look forward',
    ],
    muscles: {
      primary: ['Rectus abdominis', 'Transverse abdominis'],
      secondary: ['Obliques', 'Glutes', 'Shoulders'],
    },
    equipment: 'bodyweight',
    difficulty: 'beginner',
  },

  // ----------------------------------------------------------------- cardio
  treadmill: {
    posture: [
      'Stand tall with the ears, shoulders and hips stacked.',
      'Look ahead rather than down at the console.',
      'Let the arms swing naturally at about 90°.',
      'Land under your centre of mass with a quiet foot strike.',
      'Use the handrails only for balance, not for support.',
    ],
    breathing: [
      'Breathe rhythmically in time with your stride.',
      'Exhale fully to avoid shallow breathing.',
    ],
    mistakes: [
      'Leaning on the handrails and unloading the legs',
      'Over-striding and heel-braking each step',
      'Setting an incline so steep that form collapses',
      'Looking down and rounding the upper back',
    ],
    muscles: {
      primary: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'],
      secondary: ['Hip flexors', 'Core'],
    },
    equipment: 'cardio',
    difficulty: 'beginner',
  },
  'stair climber': {
    posture: [
      'Stand upright with the chest open and shoulders back.',
      'Place the whole foot on each step, not just the toes.',
      'Rest the hands lightly on the rails for balance only.',
      'Drive through the heel of the leading leg.',
      'Keep the steps deliberate rather than short and bouncy.',
    ],
    breathing: ['Breathe steadily and deeply throughout.', 'Exhale on the drive of each step.'],
    mistakes: [
      'Hanging body weight on the handrails',
      'Taking rapid, shallow steps',
      'Leaning far forward over the console',
      'Letting the heels hang off the back of the step',
    ],
    muscles: {
      primary: ['Glutes', 'Quadriceps'],
      secondary: ['Hamstrings', 'Calves', 'Core'],
    },
    equipment: 'cardio',
    difficulty: 'intermediate',
  },
  bike: {
    posture: [
      'Set the saddle so the knee is slightly bent at the bottom of the stroke.',
      'Keep a neutral spine with a light bend in the elbows.',
      'Position the ball of the foot over the pedal spindle.',
      'Keep the knees tracking straight ahead.',
      'Pedal smooth full circles rather than stamping down.',
    ],
    breathing: [
      'Breathe deeply and evenly with the cadence.',
      'Avoid holding your breath on hard intervals.',
    ],
    mistakes: [
      'Riding with the saddle too low and overloading the knees',
      'Rocking the hips side to side',
      'Gripping the bars tightly and tensing the shoulders',
      'Setting resistance so low the legs never load',
    ],
    muscles: {
      primary: ['Quadriceps', 'Glutes'],
      secondary: ['Hamstrings', 'Calves'],
    },
    equipment: 'cardio',
    difficulty: 'beginner',
  },
  elliptical: {
    posture: [
      'Stand upright with the weight through the mid-foot.',
      'Keep the core lightly braced and the shoulders relaxed.',
      'Push and pull the handles in time with the stride.',
      'Keep the heels down on the pedals.',
      'Maintain a smooth, even stride length.',
    ],
    breathing: ['Breathe rhythmically with the stride.', 'Exhale on the push phase.'],
    mistakes: [
      'Leaning on the fixed rails and coasting',
      'Bouncing up onto the toes',
      'Letting the machine momentum drive the legs',
      'Hunching forward over the console',
    ],
    muscles: {
      primary: ['Quadriceps', 'Glutes', 'Hamstrings'],
      secondary: ['Calves', 'Chest', 'Back', 'Core'],
    },
    equipment: 'cardio',
    difficulty: 'beginner',
  },
  'rowing machine': {
    posture: [
      'Start with shins vertical, arms straight and shoulders in front of the hips.',
      'Drive with the legs first, then swing the torso, then pull the arms.',
      'Keep the chain or strap travelling in a straight horizontal line.',
      'Finish with the handle at the lower ribs and a slight backward lean.',
      'Reverse the order on the recovery: arms, torso, then legs.',
    ],
    breathing: ['Exhale on the drive.', 'Inhale during the recovery back to the catch.'],
    mistakes: [
      'Pulling with the arms before the legs have driven',
      'Rounding the lower back at the catch',
      'Leaning too far back at the finish',
      'Rushing the recovery and losing rhythm',
    ],
    muscles: {
      primary: ['Quadriceps', 'Glutes', 'Latissimus dorsi'],
      secondary: ['Hamstrings', 'Rhomboids', 'Biceps', 'Core'],
    },
    equipment: 'cardio',
    difficulty: 'intermediate',
  },
};

export default EXERCISE_COACHING;
