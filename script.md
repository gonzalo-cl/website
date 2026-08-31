# Paper of the Future concept demonstration

Internal rough draft for Gonzalo, Matt, George, and Jaume.

## Concept

This should be a selective demonstration of what the website communicates that the papers cannot communicate in the same way—not a compressed tour of every section.

The central idea is that a reader can move between three linked levels of each construction:

1. the geometric idea;
2. the reformulation of a changing domain as an equation on a fixed space; and
3. the rigorous argument that proves an exact solution exists.

Interactive transitions let readers recognize the same mathematical object as its representation changes. Evidence labels and captions distinguish exploratory numerics, explanatory diagrams, exact algebra, and rigorous certification. The parallel layout also lets readers compare two very different proof structures without forcing either into the linear order of the other.

Target duration: 3:50–4:05, about 540 spoken words.

## READ FIRST — How everyone records in OBS

There is no build step for the current site. From the repository root, run:

    python3 -m http.server 8000

**Everyone should follow the OBS instructions below before recording a take.** Use Zoom only for the rehearsal, not for the master footage. Each person should record their own screen and narration locally in OBS Studio, then send the recording to the editor.

### One-time OBS setup

1. Install OBS Studio from https://obsproject.com/ and approve its screen-recording and microphone permissions. On macOS, restart OBS after granting the permissions.
2. Open **Settings → Video** and set both **Base (Canvas) Resolution** and **Output (Scaled) Resolution** to $1920\times1080$. Set **Common FPS Values** to $30$.
3. Create one scene named “Website recording.”
4. Add a **Window Capture** source and choose the browser window containing the website. On macOS 13 or later, add **macOS Screen Capture**, set its method to **Window Capture**, and choose the browser. Leave application audio capture off. Fit the source to the canvas so that no desktop, dock, tabs, or bookmarks are visible.
5. Open **Settings → Audio**. Disable **Desktop Audio** and choose the narration microphone under **Mic/Auxiliary Audio**. Do not add the same microphone again as a separate source.
6. In the Audio Mixer, speak at the intended volume and set **Mic/Aux** so ordinary speech peaks between roughly $-12$ and $-6$ dB and never reaches the red.
7. Open **Settings → Output**, set **Output Mode** to **Simple**, and find the **Recording** group. Choose the folder where takes will be saved, select **High Quality, Medium File Size**, and set **Recording Format** to **MKV**.

### Before recording each part

1. Use a 16:9 browser window at 100% zoom and the same light theme for all four speakers.
2. Close unrelated tabs and applications, disable notifications, and preload every section and figure named above the speaker’s blurbs.
3. Keep the website full-frame. Do not include a webcam tile; the mathematics should use the entire picture.
4. Make a 20-second test containing speech, one animation, and one top-bar section jump. Play the file back through headphones and check that the text is sharp, the pointer is visible, and the voice is clear.
5. Record at least two complete takes. Begin and end every take with one second of silence while a heading or static figure is visible.

### Recording and saving a take

1. Put the website on the first screen named above the speaker’s opening blurb.
2. In OBS, confirm that the browser fills the preview and that **Mic/Aux** moves when the speaker talks.
3. Click **Start Recording**, return to the browser, wait silently for one second, and then begin the scripted actions and narration.
4. After the final words, hold the final screen silently for one second. Return to OBS and click **Stop Recording**.
5. In OBS, choose **File → Remux Recordings**, select the new MKV file, and remux it to MP4.
6. Play the entire MP4 once before sending it. Check the beginning, every top-bar jump, the animations, the final frame, and the audio.
7. Name the MP4 files “01-gonzalo-take1.mp4,” “02-matt-take1.mp4,” “03-george-take1.mp4,” and “04-jaume-take1.mp4,” increasing the take number as needed.

Do not scroll rapidly between distant sections. When the script says to move to another numbered section, open the website’s top navigation bar and click that section number. Pause briefly after the page lands before interacting with its figure.

## Section focus map

Each speaker is responsible for the following part of the story:

- **Gonzalo — Sections 1.1, 1.2, and 1.5:** build the intuition for Pompeiu’s moving probe; connect it to Schiffer’s vibration problem through Williams’ equivalence; use the Chladni photograph and animation; and end with the pictures of the $D_{10}$ counterexample and the $D_{28}$ numerical illustration. Skip the literature tour in Sections 1.3–1.4.
- **Matt — Section 2.1, then Sections 3.1–3.3:** first run the complete fixed-disc overview animation. Then explain how the numerical search reaches zero flux, how the conformal map moves the problem to one disk, and how the compatible inverse packages the field and shape into $x=(g,p)$.
- **George — Sections 3.4–3.7:** explain how the finite block, nearby coefficients, and infinite tail are bounded; spend most of the time on the radius test and fixed-point iteration in Section 3.5; then show reconstruction of the non-disk domain and the Berenstein companion.
- **Jaume — Section 2.2, then Sections 4.1–4.8:** first run the complete real-order overview animation. Then explain the cone quotient, fixed collar, half-cylinder limit, uniform estimates, bifurcation and quadratic bending, near-integer crossings, and final planar landing. Move quickly through Sections 4.1–4.5 and slow down for Sections 4.6–4.8.

## Script and shot list

### 0:00–0:45 — Gonzalo — Pompeiu, Schiffer, and the counterexamples

#### Opening theorem, then Section 1.1 · Pompeiu’s problem

*Screen: Hold on the opening theorem for one beat. Use the top navigation to click Section 1.1, show the moving-probe explanation, and briefly drag the probe.*

“Pompeiu’s problem asks whether a moving measuring probe can lose information. Take a footprint, translate and rotate it over an unknown field, and record only the integral inside. Can a nonzero pattern remain invisible to every placement?”

#### Section 1.2 · Schiffer’s problem

*Screen: Use the top navigation to click Section 1.2. Show the Chladni photograph, play the membrane animation, change radial mode once, and then pause on Williams’ equivalence.*

“Williams showed that this is equivalent to Schiffer’s vibration problem. Think of the footprint as a membrane: can it have a nonconstant mode whose height is constant around the boundary and whose outward slope there is zero? The disk can. In this Chladni animation, we can switch between radial modes and watch the nodal circles where the membrane stays still.”

#### Section 1.5 · The new counterexamples

*Screen: Use the top navigation to click Section 1.5. Hold on the $D_{10}$ and $D_{28}$ portraits with their evidence labels visible.*

“For nearly a century, the conjecture was that no smooth connected non-disk could do this. These pictures show the breakthrough: a certified $D_{10}$ counterexample and a $D_{28}$ numerical illustration of the other construction. Now we will follow the two routes that prove such domains exist.”

Transition: Hold on the two counterexample portraits, then use the $D_{10}$ portrait as the visual bridge into Section 2.1.

### 0:45–1:30 — Matt — From numerical discovery to a fixed-disc equation

#### Section 2.1 · Fixed-disc overview animation

*Screen: Use the top navigation to click Section 2.1, then click **Animate**. Let all five stages run without clicking a stage or leaving the section. Hold the final frame for one second.*

“The fixed-disc route first relaxes the Neumann condition to $\partial_\nu u=c$. At a higher $D_{10}$ Wronskian crossing, the linearization acquires a one-dimensional kernel with a ten-lobed boundary mode. Numerical continuation follows this branch until $c=0$, producing an accurate numerical centre.”

#### Sections 3.1–3.3 · Search, fixed disk, and compatible inverse

*Screen: After the Section 2.1 animation has finished, use the top navigation to click Section 3.1. At “Next,” click Section 3.2; at “Finally,” click Section 3.3. Show only the central visual in each section.*

“The numerical branch tells us where to look. Next, $\phi$ maps the unit disk to the unknown domain, while $U=u\circ\phi$ moves the eigenfunction to that fixed disk. Finally, a compatible inverse enforces both boundary conditions and yields a cubic equation for the infinite coefficient vector $x=(g,p)$, separating field and shape. The certificate must control the full infinite-dimensional problem.”

Transition: From Section 3.3, use the top navigation to click Section 3.4 for George’s first shot.

### 1:30–2:20 — George — Certification, reconstruction, and the Berenstein companion

#### Sections 3.4–3.5 · Infinite-tail bounds and the fixed-point certificate

*Screen: Begin in Section 3.4 and advance the coefficient estimate to “all bounds.” At “At $r=10^{-6}$,” use the top navigation to click Section 3.5, show the radius test, switch to the iteration view, and run the iteration once.*

“The certificate turns this candidate into a theorem. Interval arithmetic controls the finite block, including rounding errors, while analytic estimates bound the infinite tail. At $r=10^{-6}$, the radii-polynomial inequalities show that a Newton-like map sends the ball into itself and has Lipschitz constant below point six two two. Banach’s fixed-point theorem gives a unique exact solution in that certified ball.”

#### Section 3.6 · Reconstruct the domain

*Screen: Use the top navigation to click Section 3.6 and briefly show the injectivity and non-disk checks.*

“Reconstruction proves that the conformal map is injective, while a nonzero shape coefficient rules out a disk.”

#### Section 3.7 · Berenstein companion

*Screen: Use the top navigation to click Section 3.7 and show the Schiffer/Berenstein fixed-disc comparison.*

“In companion work with Siavash Sadeghi, the method also adapts to Berenstein’s switched boundary data. The Neumann trace becomes a separate equation; squaring loses its sign, and a certified sign gate recovers $\partial_\nu u=1$. The side-by-side view makes that structural change visible.”

Transition: Cut from Section 3.7 to the first stage of the Section 2.2 real-order overview.

### 2:20–3:58 — Jaume — Real order, quadratic bending, and integer landing

#### Section 2.2 · Real-order overview animation

*Screen: Use the top navigation to click Section 2.2, then click **Animate**. Let all seven stages run without clicking a stage or leaving the section. Hold the final frame until this blurb ends.*

“The overview shows the complete real-order route. We quotient an $N$-fold domain to a cone, allow the order $R$ to vary continuously, bend a nontrivial branch toward an integer, and then unfold the closed cone back into the plane.”

#### Sections 4.1–4.3 · Cone, fixed collar, and half-cylinder

*Screen: After the Section 2.2 animation has finished, use the top navigation to click Section 4.1. At “The proof works on a fixed collar,” click Section 4.2; at “The half-cylinder,” click Section 4.3.*

“The detailed proof begins by selecting one fundamental sector and identifying its sides. After rescaling the angle, the integer $N$ becomes a real parameter $R$. Only integer $R$ unfolds into the plane, but the cone-collar operator makes sense for every real $R$. The proof works on a fixed collar and uses a Dirichlet-to-Neumann map at its inner boundary to retain the discarded core exactly. The half-cylinder is the limiting model, not the domain of the proof.”

#### Sections 4.4–4.6 · Uniform estimates and branch bending

*Screen: Use the top navigation to click Section 4.4. At “Bifurcation begins,” click Section 4.5; at “the second variation,” click Section 4.6 and show the quadratic branch-bending plot.*

“Uniform collar estimates keep the inverse and transversality bounds from deteriorating as $R$ grows. Bifurcation begins at a Dirichlet–Neumann coincidence, $J_1(\rho)=J_R(\rho)=0$. A uniform Crandall–Rabinowitz theorem produces nontrivial branches, and the second variation gives $R'(0)=0$ and $R''(0)<0$, so the branch bends toward smaller order by a uniform amount.”

#### Sections 4.7–4.8 · Near-integer crossings and planar landing

*Screen: Use the top navigation to click Section 4.7 and show the near-integer plot. At “The branch starts above $N$,” click Section 4.8 and move the closing visualization to the closed state.*

“McMahon and Debye asymptotics, together with equidistribution, produce crossings $R_*=N+\delta$ arbitrarily close above integers. Choose $\delta$ smaller than the uniform decrease. The branch starts above $N$ and reaches below it, so continuity forces $R=N$ at nonzero amplitude. The integer lift then unfolds the cone into a noncircular $D_N$-symmetric planar Schiffer domain. This works for arbitrarily large $N$, giving infinitely many examples.”

#### Section 4.8 · Numerical illustration

*Screen: Stay in Section 4.8 on the closed $D_{28}$ domain and keep the “Numerical illustration” evidence label visible.*

“The displayed $D_{28}$ continuation illustrates the seam closing, but lies outside the theorem’s spectral window. The site keeps proof and illustration clearly labeled.”

End screen: Hold for two seconds on the closed domain and its evidence caption, then fade to the title and the four author names.

## Accuracy notes

- Numerical continuation constructs the centre of the computer-assisted proof; it does not prove that an exact solution exists.
- The contraction proves uniqueness only inside the certified coefficient ball.
- The radius $10^{-6}$ is a weighted coefficient-space radius, not a physical boundary distance.
- The contraction animation explains the exact inequalities; it does not rerun the archived interval-arithmetic certificate in the browser.
- The half-cylinder explains the large-order limit; the bifurcation theorem constructs branches directly on finite real-$R$ collars.
- The displayed $D_{28}$ continuation is a numerical illustration outside the proof window. It is not the branch selected in the nonexplicit existence proof.
- The bifurcation argument gives examples for arbitrarily large rotational orders, not for every sufficiently large order.

## Competition alignment

Checked against the official 2026 Paper of the Future Prize page on August 30, 2026:

https://amathr.org/prizes/paper-of-the-future-prize/

The judges ask each submission to articulate an essential communicative function unavailable in a linear paper. This script therefore emphasizes the synchronized transformations, nonlinear comparison of proof architectures, visible evidence categories, and embedded interactive explanation. It avoids presenting production polish or popularization as the main contribution.

Current submission checklist:

- Upload a short public concept-demonstration video to YouTube.
- Put a concise explanation of both the mathematics and the communicative innovation in the YouTube description.
- Include #AMRPotF.
- Email the YouTube link to PotFPrize@amathr.org by September 1, 2026.
- If selected as a finalist, provide a fully accessible prototype suitable for AMR Reviews to host or link.

Before recording, verify the official page once more in case the instructions change.
