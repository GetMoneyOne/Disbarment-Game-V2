<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, getDocs, setLogLevel } from 'firebase/firestore';

// --- GAME DATA ---
const gameData = {
    "start": { "text": "Welcome to the Attorney Disbarment Adventure. In this game, you are an attorney trying your best to navigate the legal world. However, no matter what, your journey will end in a wild and outrageous disbarment. Which role will you play today?\n\n**Disclaimer:** This is a satirical law simulation game. It is not legal advice. The object of the game is to get disbarred. If you want to learn how to get disbarred, you're in the right place!", "options": [{ "text": "Play as a Defense Attorney", "next": "randomizeCase" }, { "text": "Play as a Prosecutor", "next": "introProsecutor" }] },
    "caseAssignmentDefense": { "text": "A new email just hit your inbox from the Public Defender's office... What do you check first?", "options": [{ "text": "Review criminal history.", "next": "defenseCaseDetailsCharges" }, { "text": "Check victim information.", "next": "defenseCaseDetailsVictim" }, { "text": "Examine the police report.", "next": "defenseCaseDetailsReport" }] },
    "defenseCaseDetailsCharges": { "text": "The client is **[defendantName]**. He's been charged with **[charges]**. His criminal history shows **[history]**", "options": [{ "text": "Now check victim information.", "next": "defenseCaseDetailsVictim" }, { "text": "I have enough info. Proceed to First Appearance.", "next": "prosecutorMakesArgument" }] },
    "defenseCaseDetailsVictim": { "text": "The victim is identified as **[victim]**.", "options": [{ "text": "Now review criminal history.", "next": "defenseCaseDetailsCharges" }, { "text": "I have enough info. Proceed to First Appearance.", "next": "prosecutorMakesArgument" }] },
    "defenseCaseDetailsReport": { "text": "The police report indicates the following: **[incident]**", "options": [{ "text": "Now review criminal history.", "next": "defenseCaseDetailsCharges" }, { "text": "I have enough info. Proceed to First Appearance.", "next": "prosecutorMakesArgument" }] },
    "prosecutorMakesArgument": { "text": "You arrive at the First Appearance hearing. The prosecutor stands up... arguing for a high bond...", "options": [{ "text": "It's your turn to respond. What is your counter-argument?", "next": "defenseResponds" }] },
    "defenseResponds": { "text": "The Commissioner turns to you. 'Counsel, your response?'", "options": [ { "text": "Argue for Release on Own Recognizance (O/R).", "next": "calculateRuling", "argument": "OR" }, { "text": "Propose release with Strict Conditions (GPS, No Contact).", "next": "calculateRuling", "argument": "Conditions" }, { "text": "Argue for a more reasonable Bond.", "next": "calculateRuling", "argument": "Bond" }] },
    "commissionerDecisionOR": { "text": "The Commissioner agrees with you and grants O/R. Your client is released! ... The Arraignment is set for two weeks from now.", "options": [{ "text": "Fast forward two weeks to the Arraignment.", "next": "arraignmentHearingOR" }] },
    "commissionerDecisionHighBond": { "text": "The Commissioner sides with the prosecutor and sets a high bond ($50,000). Your client is led back into custody. The Arraignment is set for tomorrow morning.", "options": [{ "text": "Proceed to the Arraignment.", "next": "arraignmentHearingCustody" }] },
    "commissionerDecisionStrictConditions": { "text": "The Commissioner grants release with very strict conditions... The Arraignment is set for two weeks from now.", "options": [{ "text": "Fast forward two weeks to the Arraignment.", "next": "arraignmentHearingConditions" }] },
    "arraignmentHearingOR": { "text": "It's the day of the Arraignment. You wait outside the courtroom, but your client is nowhere to be seen... a bench warrant for his arrest is issued.", "options": [{ "text": "Try to call your client's phone, which goes straight to voicemail.", "next": "failToAppearWarrant" }] },
    "failToAppearWarrant": { "disbarment": { "message": "Disbarred: For 'failing to properly advise a client on the consequences of non-appearance.'", "moral": "When a client is released, your job is to ensure they understand that failing to appear is a serious crime in itself." } },
    "arraignmentHearingConditions": { "text": "Your client arrives for the Arraignment... Suddenly, his ex-girlfriend... screams that he's been calling her from a blocked number...", "options": [{ "text": "Pull your client aside and demand to know if it's true.", "next": "arraignmentConfrontClient" }, { "text": "Ignore her and quickly guide your client into the courtroom.", "next": "arraignmentIgnoreVictim" }] },
    "arraignmentHearingCustody": { "text": "You meet your client in the courtroom... you get a frantic call from the jail. Your client was in a fight...", "options": [{ "text": "Listen to the prosecutor's statement.", "next": "arraignmentProsecutorAction" }] },
    "arraignmentProsecutorAction": { "text": "The prosecutor informs the judge, '...the State is amending the Information to add a second felony charge... And we've just been made aware of a new assault charge...'", "options": [{ "text": "Object vehemently to the last-minute changes.", "next": "arraignmentObject" }, { "text": "Accept the amended information and proceed.", "next": "arraignmentAccept" }] },
    "arraignmentAccept": { "text": "You accept the amended charges and enter a 'Not Guilty' plea... 'We're doomed!' he cries. 'You have to do something!'", "options": [{ "text": "Let's fight this with motions.", "next": "preTrialMotions" }, { "text": "Attempt to negotiate a plea.", "next": "pleaNegotiation" }, { "text": "Nod grimly. 'We need to get... creative.'", "next": "unethicalPath" }] },
    "pleaNegotiation": { "text": "You meet with the prosecutor. ...'Your client pleads guilty to the main charge... It's the best he's going to get.'", "options": [{"text": "Advise your client to take the deal.", "next": "pleaAccepted"}, {"text": "Reject the deal. We're taking this to trial.", "next": "preTrialMotions"}] },
    "pleaAccepted": { "isEnding": true, "disbarment": { "message": "YOU LOSE... BY WINNING?", "moral": "By competently representing your client and achieving a reasonable resolution, you have utterly failed in your quest for a spectacular disbarment. Congratulations on your continued, successful legal career." } },
    "preTrialMotions": { "text": "The case is now in the pre-trial phase... What is your primary approach for the Omnibus Hearing?", "options": [{ "text": "File for a continuance.", "next": "omnibusContinuance" }, { "text": "File a Motion to Dismiss.", "next": "omnibusDismiss" }, { "text": "File a Motion to Recuse the judge.", "next": "omnibusRecuse" }, { "text": "Do nothing and wait.", "next": "clientGetsAngry" }] },
    "omnibusContinuance": { "text": "At the Omnibus Hearing, the judge reluctantly grants your motion... Now you must respond to their discovery requests.", "options": [{ "text": "Proceed to the Discovery Phase.", "next": "discoveryPhase" }] },
    "omnibusDismiss": { "text": "At the Omnibus Hearing, the judge hears your Motion to Dismiss... 'Denied. With prejudice. And I'm sanctioning you $500...'", "options": [{ "text": "Pay the sanction and proceed to Discovery.", "next": "discoveryPhase" }] },
    "omnibusRecuse": { "text": "The judge reads your Motion to Recuse... 'denied. I will, however, be referring this motion to the bar association...'", "options": [{ "text": "Face the bar investigation.", "next": "barInvestigation" }] },
    "barInvestigation": { "text": "You receive a thick envelope from the State Bar Association... You must provide a written response...", "options": [{ "text": "Write a respectful response.", "next": "barResponseProfessional" }, { "text": "Write a defiant response.", "next": "barResponseHostile" }] },
    "barResponseProfessional": { "disbarment": { "message": "Disbarred: For 'a pattern of filing frivolous motions.'", "moral": "One frivolous motion might get you sanctioned; a pattern of them will get you disbarred." } },
    "barResponseHostile": { "disbarment": { "message": "Disbarred: For 'unprofessional conduct and contempt for the disciplinary process.'", "moral": "When you are being investigated by the bar, defiance is the worst possible strategy." } },
    "discoveryPhase": { "text": "You receive the State's discovery request... How do you respond?", "options": [{ "text": "Comply fully.", "next": "discoveryComply", "proPoints": 1 }, { "text": "Bury them in paperwork.", "next": "discoveryBury" }, { "text": "Withhold a few key documents.", "next": "discoveryWithhold" }] },
    "discoveryComply": { "text": "You spend weeks meticulously preparing your discovery response... it's time to question the witnesses...", "options": [{ "text": "Schedule the depositions.", "next": "depositionPhase" }] },
    "depositionPhase": { "text": "It's time to take depositions... Who do you depose first?", "options": [{ "text": "Depose the victim.", "next": "deposeVictim" }, { "text": "Depose the primary eyewitness.", "next": "deposeWitness" }, { "text": "Skip depositions.", "next": "skipDepositions" }] },
    "deposeVictim": { "text": "You are in a conference room... ready to depose the victim... How do you approach the questioning?", "options": [{ "text": "Professionally question them.", "next": "motionsInLiminePhase", "proPoints": 1 }, { "text": "Be aggressive.", "next": "deposeVictimAggressive" }, { "text": "Ask probing, irrelevant questions.", "next": "deposeVictimHarass" }] },
    "deposeWitness": { "text": "You are deposing the main eyewitness... How do you challenge their account?", "options": [{ "text": "Carefully probe for inconsistencies.", "next": "motionsInLiminePhase", "proPoints": 1 }, { "text": "Subtly suggest an alternative version of events.", "next": "deposeWitnessCoach" }, { "text": "Offer them a generous 'consulting fee'.", "next": "deposeWitnessBribe" }] },
    "motionsInLiminePhase": { "text": "Depositions are complete. Before trial, you have the opportunity to file 'Motions in Limine'...", "options": [{ "text": "File a motion to exclude your client's prior convictions.", "next": "limineSuccess", "proPoints": 1 }, { "text": "File a motion to exclude photos of the victim's injuries.", "next": "limineFailure" }, { "text": "File a motion to forbid the prosecutor from using the word 'victim.'", "next": "limineSanction" }] },
    "limineSuccess": { "text": "The judge agrees that your client's old history is not relevant... It's a small but significant victory.", "options": [{ "text": "Proceed to trial, now armed with a favorable ruling.", "next": "jurySelection" }] },
    "limineFailure": { "text": "The judge looks at you, baffled... 'Your motion is not just denied, it's frankly bizarre.'", "options": [{ "text": "Humbly accept the ruling and proceed to trial.", "next": "jurySelection" }] },
    "jurySelection": { "text": "Weeks of preparation have led to this: the first day of trial... **voir dire**, is about to begin.", "options": [{"text": "Let's begin jury selection.", "next": "jurySelectionQuestions"}] },
    "jurySelectionQuestions": { "text": "During jury selection, a potential juror admits they have a cousin who was a victim of a similar assault... What do you do?", "options": [{"text": "Use one of your peremptory challenges to strike the juror.", "next": "openingStatement", "proPoints": 1}, {"text": "Try to get them struck for cause.", "next": "jurySelectionChallenge"}, {"text": "Keep them on the jury.", "next": "jurySelectionKeep"}] },
    "openingStatement": { "text": "It's time for your opening statement... What is your strategy?", "options": [{"text": "Deliver a calm, fact-based statement.", "next": "prosecutionCaseInChief", "proPoints": 1}, {"text": "Give a passionate, emotional speech.", "next": "openingStatementEmotional"}, {"text": "Promise the jury a surprise witness.", "next": "openingStatementPromise"}, {"text": "Subtly hint about your client's 'past troubles'.", "next": "violateLimine", "condition": "limineSuccess"}] },
    "prosecutionCaseInChief": { "text": "The prosecutor begins their case-in-chief... It's time for halftime motions.", "options": [{"text": "End your cross-examination.", "next": "halftimeMotionAddCharge"}] },
    "halftimeMotionAddCharge": { "text": "After the prosecutor finishes with the witness... they move to amend the charges to include Witness Intimidation.", "options": [{ "text": "Object! This is a tactical ambush!", "next": "halftimeObject" }, { "text": "Accept the amended information.", "next": "defenseCaseInChief" }, { "text": "Move for a mistrial!", "next": "halftimeMistrial" }] },
    "defenseCaseInChief": { "text": "It's your turn to present your case... After your direct examination, the prosecutor begins their cross-examination.", "options": [{"text": "Listen to the cross-examination.", "next": "witnessFlips"}] },
    "witnessFlips": { "text": "On cross-examination, the prosecutor shows the waiter a photo of your client keying his car... The waiter changes his entire story.", "options": [{"text": "Object! 'Relevance, your honor!'", "next": "closingArgument", "proPoints": 1}, {"text": "Immediately demand a mistrial.", "next": "witnessExaminationMistrial"}] },
    "closingArgument": { "text": "The evidence is in... It's time for your closing argument... What is your final pitch?", "options": [{"text": "Argue 'proof beyond a reasonable doubt.'", "next": "juryDeliberation", "proPoints": 1}, {"text": "Personally vouch for your client's character.", "next": "closingArgumentVouch"}, {"text": "Accuse the prosecutor of a conspiracy.", "next": "closingArgumentConspiracy"}] },
    "juryDeliberation": { "text": "You've said your piece... they file out of the courtroom to begin deliberations... All you can do now is wait.", "options": [{"text": "Await the jury's verdict.", "next": "verdict"}] },
    "guiltyVerdict": { "text": "The jury returns with a verdict: **Guilty** on all counts... Your client turns to you, 'What now? You have to appeal this!'", "options": [{"text": "File a notice of appeal immediately.", "next": "appealProcess"}, {"text": "Tell him an appeal is pointless.", "next": "appealDiscourage"}] },
    "appealProcess": { "text": "You've filed the notice of appeal... writing the appellate brief... to find a reversible error.", "options": [{"text": "Write a flawless, well-argued brief.", "next": "appealSuccess"}, {"text": "Throw together a sloppy, last-minute brief.", "next": "appealSloppy"}, {"text": "Completely miss the filing deadline.", "next": "appealMissDeadline"}] },
    "appealSuccess": { "text": "Your appellate brief is a work of art... They reverse the conviction and remand the case back for a new trial.", "options": [{"text": "Prepare for round two. A new trial begins.", "next": "jurySelection"}] },
    "acquittal": { "isEnding": true, "disbarment": { "message": "YOU WON... YOU LOSE THE GAME!", "moral": "By demonstrating flawless ethics and superb legal skill, you have utterly failed in your quest for a spectacular disbarment. Congratulations on your successful career, you competent, ethical loser." } }
    // ... many disbarment and prosecutor paths are truncated for brevity ...
};

// ... defendantProfiles constant is here ...

const defendantProfiles = [
    { key: 'vandelay', name: "Mr. Arthur 'Art' Vandelay", charges: "Assault in the First Degree (Felony A)", history: "a prior Assault 3rd Degree (Gross Misdemeanor) from 5 years ago, and a DUI from 10 years ago. He is currently unemployed.", victim: "Ms. Elaine Benes, age 45, who sustained a broken nose and significant bruising. A protective order has been requested.", incident: "at a restaurant, following a verbal altercation, he allegedly threw a ceramic plate, striking the victim. Witnesses differ on who instigated the physical aspect.", riskFactors: { flight: 1, harm: 8 } },
    { key: 'newman', name: "Mr. Newman 'The Mailman' Post", charges: "Malicious Mischief in the First Degree (Felony B) & Resisting Arrest", history: "multiple complaints for 'improper mail handling' and a restraining order from a local dog. He is employed by the US Postal Service.", victim: "the community mailbox for the 'Pleasant Valley' subdivision, which was found filled with jelly.", incident: "Mr. Post was found covered in jelly near the vandalized mailbox, muttering about 'a war on junk mail.' He allegedly tried to flee on his mail truck when police arrived.", riskFactors: { flight: 5, harm: 2 } },
    { key: 'peterman', name: "Mr. J. Peterman", charges: "Theft in the First Degree (Felony B)", history: "no criminal history, but a well-documented history of 'adventures' in Burma and other exotic locales. He owns a successful catalog company.", victim: "the 'Urban Sombrero,' a priceless artifact from the 'Sultan of Swat's' private collection.", incident: "Mr. Peterman was arrested at a high-society auction after allegedly swapping the real Urban Sombrero with a cheap knock-off he claims is 'even more authentic.' He insists it was a 'misunderstanding of epic proportions.'", riskFactors: { flight: 8, harm: 1 } },
    { key: 'brenda', name: "Ms. Brenda H.", charges: "Theft in the Third Degree (Gross Misdemeanor)", history: "no criminal history. She is a single mother of two.", victim: "a local branch of a national grocery store chain.", incident: "store security observed her placing baby formula and diapers into her bag and attempting to leave without paying. She expressed remorse and stated she had recently lost her job.", riskFactors: { flight: 1, harm: 1 } },
    { key: 'kenny', name: "Mr. Kenny R.", charges: "Driving While License Suspended in the Third Degree (Misdemeanor)", history: "two prior convictions for the same offense and a history of unpaid traffic tickets.", victim: "The State of Washington.", incident: "he was pulled over for a broken taillight. A routine check revealed his license was suspended for failure to pay fines.", riskFactors: { flight: 3, harm: 1 } }
];

const App = () => {
    const [scene, setScene] = useState(gameData.start);
    const [storyHistory, setStoryHistory] = useState([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [currentCase, setCurrentCase] = useState(null);
    const [flightRisk, setFlightRisk] = useState(0);
    const [communityHarm, setCommunityHarm] = useState(0);
    const [professionalism, setProfessionalism] = useState(0);
    const [limineSuccess, setLimineSuccess] = useState(false);
    const [visitedScenes, setVisitedScenes] = useState(new Set());
    const [showRiskScores, setShowRiskScores] = useState(false);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        const initFirebase = async () => {
            const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const canvasFirebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
            if (canvasFirebaseConfigStr === '{}' || getApps().length > 0) {
                 if(getApps().length > 0) {
                    const app = getApp();
                    setDb(getFirestore(app));
                    setAuth(getAuth(app));
                    onAuthStateChanged(getAuth(app), (user) => { if(user) setUserId(user.uid); setIsAuthReady(true); });
                 } else {
                    setUserId(crypto.randomUUID());
                    setIsAuthReady(true);
                 }
                 return;
            }
            try {
                const app = initializeApp(JSON.parse(canvasFirebaseConfigStr));
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);
                setAuth(authInstance);
                setDb(dbInstance);
                setLogLevel('debug');
                onAuthStateChanged(authInstance, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                        setIsAuthReady(true);
                    } else {
                        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';
                        if (token) await signInWithCustomToken(authInstance, token);
                        else await signInAnonymously(authInstance);
                    }
                });
            } catch (error) {
                console.error("Firebase init error:", error);
                setUserId(crypto.randomUUID());
                setIsAuthReady(true);
            }
        };
        initFirebase();
    }, []);

    const saveGameHistory = useCallback(async (currentScenarioText, chosenOptionText) => {
        if (!isAuthReady || !db || !userId) return;
        const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const historyEntry = { timestamp: new Date(), scenarioText: currentScenarioText, chosenOption: chosenOptionText, userId, appId: canvasAppId };
        try {
            await addDoc(collection(db, `artifacts/${canvasAppId}/public/data/gameHistory`), historyEntry);
        } catch (error) {
            console.error("Error saving game history:", error);
        }
    }, [db, userId, isAuthReady]);

    const handleChoice = useCallback((choice) => {
        setStoryHistory(prev => [...prev, { scenarioText: scene.text, chosenOption: choice.text }]);
        saveGameHistory(scene.text, choice.text);
        if(choice.proPoints) setProfessionalism(prev => prev + choice.proPoints);
        
        let nextSceneKey = choice.next;
        if (nextSceneKey === 'randomizeCase') {
            const randomCase = defendantProfiles[Math.floor(Math.random() * defendantProfiles.length)];
            setCurrentCase(randomCase);
            setFlightRisk(randomCase.riskFactors.flight);
            setCommunityHarm(randomCase.riskFactors.harm);
            setShowRiskScores(true);
            nextSceneKey = 'caseAssignmentDefense';
        } else if (nextSceneKey === 'calculateRuling') {
            let score = flightRisk + communityHarm;
            if (choice.argument === 'OR') score += communityHarm > 7 ? 5 : -2;
            else if (choice.argument === 'Conditions') score -= 4;
            else if (choice.argument === 'Bond') score += 1;
            if (score <= 2) nextSceneKey = 'commissionerDecisionOR';
            else if (score <= 12) nextSceneKey = 'commissionerDecisionStrictConditions';
            else nextSceneKey = 'commissionerDecisionHighBond';
        } else if (nextSceneKey === 'verdict') {
            nextSceneKey = professionalism >= 5 ? 'acquittal' : 'guiltyVerdict';
        } else if (nextSceneKey === 'limineSuccess') {
            setLimineSuccess(true);
        }
        
        const nextScene = gameData[nextSceneKey];
        if (nextScene) {
            if (!visitedScenes.has(nextSceneKey) && nextScene.riskFactors) {
                setFlightRisk(prev => prev + (nextScene.riskFactors.flight || 0));
                setCommunityHarm(prev => prev + (nextScene.riskFactors.harm || 0));
                setVisitedScenes(prev => new Set(prev).add(nextSceneKey));
                setShowRiskScores(true);
            }
            if(nextScene.isEnding) setIsGameOver(true);
            setScene(nextScene);
            if (nextScene.disbarment) setIsGameOver(true);
        }
    }, [scene, saveGameHistory, flightRisk, communityHarm, visitedScenes, professionalism]);
    
    const restartGame = useCallback(() => {
        setScene(gameData.start);
        setStoryHistory([]);
        setIsGameOver(false);
        setCurrentCase(null);
        setFlightRisk(0);
        setCommunityHarm(0);
        setProfessionalism(0);
        setLimineSuccess(false);
        setVisitedScenes(new Set());
        setShowRiskScores(false);
    }, []);

    const renderSceneText = () => {
        let text = scene.text;
        if(currentCase) {
            text = text.replace(/\[defendantName\]/g, currentCase.name).replace(/\[charges\]/g, currentCase.charges).replace(/\[history\]/g, currentCase.history).replace(/\[victim\]/g, currentCase.victim).replace(/\[incident\]/g, currentCase.incident);
        }
        return { __html: `<p>${text.replace(/\*\*(.*?)\*\*/g, '<b class="text-amber-400">$1</b>').split('\n').join('</p><p>')}</p>` };
    };

    if (!isAuthReady) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4"><p className="text-xl animate-pulse">Initializing Authentication...</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex items-center justify-center p-4">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap');
                body { background-color: #111827; } /* bg-gray-900 */
                .font-serif { font-family: 'Playfair Display', serif; }
                .font-sans { font-family: 'Inter', sans-serif; }
                .btn { transition: all 0.2s ease-in-out; }
                .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4); }
            `}</style>
            
            <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8">
                <div className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold font-serif text-amber-300">Attorney Disbarment Adventure</h1>
                    <p className="text-gray-400 mt-2">Your journey to professional ruin starts now.</p>
                </div>
                {showRiskScores && !isGameOver && (
                     <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg mb-6 text-sm text-center text-gray-300">
                        <span className="font-semibold">Case Assessment:</span> Flight Risk: <b className="text-amber-400">{flightRisk}</b> | Community Harm: <b className="text-red-400">{communityHarm}</b>
                    </div>
                )}
                <div className="text-lg leading-relaxed text-gray-300 mb-6" dangerouslySetInnerHTML={renderSceneText()} />
                {isGameOver ? (
                    <div className="mt-4">
                        <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 p-6 rounded-lg">
                            <h2 className="text-2xl font-bold font-serif text-red-400 mb-3">{scene.disbarment.message}</h2>
                            <p className="italic text-red-300 border-t border-red-500/50 pt-4 mt-4"><b>Moral of the story:</b> {scene.disbarment.moral}</p>
                        </div>
                        <button onClick={restartGame} className="w-full mt-6 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105">
                            Play Again & Fail Differently
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-3">
                        {scene.options && scene.options.filter(choice => !choice.condition || (choice.condition === 'limineSuccess' && limineSuccess)).map((choice, index) => (
                            <button key={index} onClick={() => handleChoice(choice)} className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-3 px-4 rounded-lg text-left transition-transform hover:scale-105">
                                {choice.text}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
=======
import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, getDocs, setLogLevel } from 'firebase/firestore';

// --- GAME DATA ---
// All story, choices, and consequences are stored here directly.
const gameData = {
    "start": {
        "text": "Welcome to the Attorney Disbarment Adventure. In this game, you are an attorney trying your best to navigate the legal world. However, no matter what, your journey will end in a wild and outrageous disbarment. Which role will you play today?\n\n**Disclaimer:** This is a satirical law simulation game. It is not legal advice. The object of the game is to get disbarred. If you want to learn how to get disbarred, you're in the right place!",
        "options": [{
            "text": "Play as a Defense Attorney",
            "next": "randomizeCase"
        }, {
            "text": "Play as a Prosecutor",
            "next": "introProsecutor"
        }]
    },
    // --- DEFENSE ATTORNEY PATH ---
    "caseAssignmentDefense": {
        "text": "A new email just hit your inbox from the Public Defender's office: you've been assigned a fresh, high-stakes Superior Court criminal matter. It's an overnight arrest, so you need to prepare for the First Appearance. You quickly pull up the preliminary client info. What do you check first?",
        "options": [{ "text": "Review the client's criminal history and charges.", "next": "defenseCaseDetailsCharges" }, { "text": "Look for victim information and any potential safety concerns.", "next": "defenseCaseDetailsVictim" }, { "text": "Examine the police report for initial arrest details.", "next": "defenseCaseDetailsReport" }]
    },
    "defenseCaseDetailsCharges": {
        "text": "The client is **[defendantName]**. He's been charged with **[charges]**. His criminal history shows **[history]**",
        "options": [{ "text": "Now check victim information.", "next": "defenseCaseDetailsVictim" }, { "text": "I have enough info. Proceed to First Appearance.", "next": "prosecutorMakesArgument" }]
    },
    "defenseCaseDetailsVictim": {
        "text": "The victim is identified as **[victim]**.",
        "options": [{ "text": "Now review the client's criminal history and charges.", "next": "defenseCaseDetailsCharges" }, { "text": "I have enough info. Proceed to First Appearance.", "next": "prosecutorMakesArgument" }]
    },
    "defenseCaseDetailsReport": {
        "text": "The police report indicates the following: **[incident]**",
        "options": [{ "text": "Now check the client's criminal history and charges.", "next": "defenseCaseDetailsCharges" }, { "text": "I have enough info. Proceed to First Appearance.", "next": "prosecutorMakesArgument" }]
    },
    "prosecutorMakesArgument": {
        "text": "You arrive at the First Appearance hearing. The prosecutor stands up to address the Commissioner. Given the facts of the case, they are arguing for a high bond, citing the felony charge, your client's criminal history, and the explicit safety concerns raised by the victim.",
        "options": [{ "text": "It's your turn to respond. What is your counter-argument?", "next": "defenseResponds" }]
    },
    "defenseResponds": {
        "text": "The Commissioner turns to you. 'Counsel, your response?' You need to counter the prosecutor's request for a high bond.",
        "options": [
            { "text": "Argue for Release on Own Recognizance (O/R), emphasizing community ties.", "next": "calculateRuling", "argument": "OR" },
            { "text": "Propose release with Strict Conditions (GPS, No Contact) as a safer alternative to O/R.", "next": "calculateRuling", "argument": "Conditions" },
            { "text": "Concede that some security is needed, but argue for a more reasonable Bond.", "next": "calculateRuling", "argument": "Bond" }
        ]
    },
    "commissionerDecisionOR": {
        "text": "The Commissioner agrees with you and grants O/R. Your client is released! As you walk out, you firmly instruct him to obey all laws and show up for his next court date. The Arraignment is set for two weeks from now.",
        "options": [
            { "text": "Fast forward two weeks to the Arraignment.", "next": "arraignmentHearingOR" }
        ]
    },
    "commissionerDecisionHighBond": {
        "text": "The Commissioner sides with the prosecutor and sets a high bond ($50,000). Your client, unable to post bail, is led back into custody. The Arraignment is set for tomorrow morning.",
        "options": [
            { "text": "Proceed to the Arraignment.", "next": "arraignmentHearingCustody" }
        ]
    },
    "commissionerDecisionStrictConditions": {
        "text": "The Commissioner grants release with very strict conditions, including GPS monitoring and a 9 pm curfew. You explain the importance of following these rules exactly. The Arraignment is set for two weeks from now.",
        "options": [
            { "text": "Fast forward two weeks to the Arraignment.", "next": "arraignmentHearingConditions" }
        ]
    },
    "arraignmentHearingOR": {
        "text": "It's the day of the Arraignment. You wait outside the courtroom, but your client is nowhere to be seen. The clerk calls your case. Your client has failed to appear. The judge immediately issues a bench warrant for his arrest.",
        "options": [
            { "text": "Try to call your client's phone, which goes straight to voicemail.", "next": "failToAppearWarrant" }
        ]
    },
    "failToAppearWarrant": {
        "text": "A week later, you get a call. Your client has been arrested on the warrant in a neighboring state after trying to use a fake ID to rent a jet ski. He will be held in custody for the remainder of the trial. The judge is furious about the flight, and the prosecutor has added a felony charge for 'Bail Jumping.'",
        "disbarment": { "message": "Disbarred: For 'failing to properly advise a client on the consequences of non-appearance.' The bar concludes that your client's flight was a direct result of your failure to impress upon him the seriousness of his situation. Your inability to control your client and ensure their appearance in court is deemed gross negligence, leading to your disbarment.", "moral": "When a client is released, your job is to ensure they understand that failing to appear is a serious crime in itself. Any perceived lapse in this duty can make you responsible for their actions." }
    },
    "arraignmentHearingConditions": {
        "text": "Your client arrives for the Arraignment. He proudly shows you his pristine GPS tracking report. Suddenly, his ex-girlfriend, the victim Ms. Benes, storms into the hallway, screaming that he's been calling her from a blocked number, a clear violation of the no-contact order.",
        "options": [
            { "text": "Pull your client aside and demand to know if it's true.", "next": "arraignmentConfrontClient" },
            { "text": "Ignore her and quickly guide your client into the courtroom.", "next": "arraignmentIgnoreVictim" }
        ]
    },
    "arraignmentHearingCustody": {
        "text": "You meet your client in the courtroom. He is brought in wearing jail clothes. He looks haggard and angry. Just before the hearing starts, you get a frantic call from the jail. Your client was in a fight in the chow hall and is now facing a new in-custody assault charge.",
        "options": [
            { "text": "Listen to the prosecutor's statement on the original charge.", "next": "arraignmentProsecutorAction" }
        ]
    },
    "arraignmentProsecutorAction": {
        "text": "The prosecutor informs the judge, 'Your Honor, after speaking with additional witnesses from the restaurant, the State is amending the Information to add a second felony charge: **Assault with a Deadly Weapon**, for the use of the ceramic plate. And we've just been made aware of a new assault charge from an incident inside the jail.'",
        "options": [
            { "text": "Object vehemently to the last-minute changes.", "next": "arraignmentObject" },
            { "text": "Accept the amended information and proceed.", "next": "arraignmentAccept" }
        ]
    },
    "arraignmentAccept": {
        "text": "You accept the amended charges and enter a 'Not Guilty' plea. The judge sets future dates, including an Omnibus Hearing. Your client is now facing significantly more prison time. Back in the jail meeting room, he is panicked. 'We're doomed!' he cries. 'You have to do something!'",
        "options": [
            { "text": "Let's fight this with motions. Time to go on the offensive.", "next": "preTrialMotions" },
            { "text": "Attempt to negotiate a plea with the prosecutor.", "next": "pleaNegotiation" },
            { "text": "Nod grimly. 'The facts are bad. We need to get... creative.'", "next": "unethicalPath" }
        ]
    },
    "pleaNegotiation": {
        "text": "You meet with the prosecutor. They're confident in their case. 'Here's the offer,' they say. 'Your client pleads guilty to the main charge, we drop the others, and we recommend a mid-range sentence. It's the best he's going to get.'",
        "options": [
            { "text": "Advise your client to take the deal. It's a certain conviction at trial.", "next": "pleaAccepted" },
            { "text": "Reject the deal. We're taking this to trial.", "next": "preTrialMotions" }
        ]
    },
    "pleaAccepted": {
        "isEnding": true,
        "text": "Your client reluctantly accepts the plea agreement. The case is resolved, and he receives a predictable, lengthy sentence. You have successfully navigated the case without any ethical violations or professional misconduct.",
        "disbarment": { "message": "YOU LOSE... BY WINNING?", "moral": "By competently representing your client and achieving a reasonable, if unexciting, resolution, you have utterly failed in your quest for a spectacular disbarment. Congratulations on your continued, successful legal career." }
    },
    "preTrialMotions": {
        "text": "The case is now in the pre-trial phase. The prosecution has significant evidence, and your client is getting more anxious by the day. It's time to formulate a strategy for the upcoming Omnibus Hearing. What is your primary approach?",
        "options": [
            { "text": "File for a continuance. We need more time to 'investigate'.", "next": "omnibusContinuance" },
            { "text": "File a Motion to Dismiss, claiming the State's evidence is insufficient.", "next": "omnibusDismiss" },
            { "text": "File a Motion to Recuse the judge, alleging a personal bias against your client.", "next": "omnibusRecuse" },
            { "text": "Do nothing and wait. The client's calls can go to voicemail for a bit.", "next": "clientGetsAngry" }
        ]
    },
    "omnibusContinuance": {
        "text": "At the Omnibus Hearing, the judge reluctantly grants your motion for a continuance. 'One month, counsel. No more.' You've bought some time, but the prosecutor looks annoyed. Now you must respond to their discovery requests.",
        "options": [{ "text": "Proceed to the Discovery Phase.", "next": "discoveryPhase" }]
    },
    "omnibusDismiss": {
        "text": "At the Omnibus Hearing, the judge hears your Motion to Dismiss. 'Counsel, this is one of the most frivolous motions I've ever seen. Denied. With prejudice. And I'm sanctioning you $500 for wasting the court's time.'",
        "options": [{ "text": "Pay the sanction and proceed to Discovery, your reputation now damaged.", "next": "discoveryPhase" }]
    },
    "omnibusRecuse": {
        "text": "The judge reads your Motion to Recuse, their face expressionless. 'Counsel, you have accused me of bias without a single shred of evidence. Your motion is denied. I will, however, be referring this motion and your conduct to the bar association for review.'",
        "options": [{ "text": "Face the bar investigation.", "next": "barInvestigation" }]
    },
    "barInvestigation": {
        "text": "You receive a thick envelope from the State Bar Association. You are under investigation for professional misconduct. You must provide a written response to the judge's allegations.",
        "options": [
            { "text": "Write a detailed, respectful response explaining your legal reasoning.", "next": "barResponseProfessional" },
            { "text": "Write a defiant response accusing the judge of a vendetta against you.", "next": "barResponseHostile" }
        ]
    },
    "barResponseProfessional": {
        "disbarment": { "message": "Disbarred: For 'a pattern of filing frivolous motions.' While your response was professional, the Bar's investigation uncovers that you've filed similar baseless motions in multiple other cases. They conclude you are a vexatious litigant who abuses the system and wastes judicial resources, revoking your license to practice law.", "moral": "One frivolous motion might get you sanctioned; a pattern of them will get you disbarred. Your professional reputation is built across all your cases, not just one." }
    },
    "barResponseHostile": {
        "disbarment": { "message": "Disbarred: For 'unprofessional conduct and contempt for the disciplinary process.' Your hostile response, filled with ad hominem attacks against a sitting judge, is seen as definitive proof that you lack the temperament and respect for the system required to be an attorney. The Bar summarily disbars you.", "moral": "When you are being investigated by the bar, defiance is the worst possible strategy. Attacking the process or the people involved will only confirm their worst assumptions about you." }
    },
    "discoveryPhase": {
        "text": "You receive the State's discovery request. It's extensive. They want all communication between you and your client, all notes from witness interviews, and your complete case file. How do you respond?",
        "options": [
            { "text": "Comply fully, providing all non-privileged information as required.", "next": "discoveryComply", "proPoints": 1 },
            { "text": "Bury them in paperwork. Send over thousands of irrelevant documents to hide the few relevant ones.", "next": "discoveryBury" },
            { "text": "Withhold a few key documents that are particularly damaging to your client's case.", "next": "discoveryWithhold" }
        ]
    },
    "discoveryComply": {
        "text": "You spend weeks meticulously preparing your discovery response. Now that the paper has been exchanged, it's time to question the witnesses under oath.",
        "options": [{ "text": "Schedule the depositions.", "next": "depositionPhase" }]
    },
    "depositionPhase": {
        "text": "It's time to take depositions. This is your chance to lock witnesses into their stories and find weaknesses in the State's case. Who do you depose first?",
        "options": [
            { "text": "Depose the victim.", "next": "deposeVictim" },
            { "text": "Depose the primary eyewitness from the restaurant.", "next": "deposeWitness" },
            { "text": "Skip depositions. They're expensive and rarely change anything.", "next": "skipDepositions" }
        ]
    },
    "deposeVictim": {
        "text": "You are in a conference room with the prosecutor and a court reporter, ready to depose the victim. They look nervous. How do you approach the questioning?",
        "options": [
            { "text": "Professionally question them about the facts of the incident.", "next": "motionsInLiminePhase", "proPoints": 1 },
            { "text": "Be aggressive. Question them relentlessly about every minor inconsistency.", "next": "deposeVictimAggressive" },
            { "text": "Ask probing, irrelevant questions about their past to unsettle them.", "next": "deposeVictimHarass" }
        ]
    },
    "deposeWitness": {
        "text": "You are deposing the main eyewitness. Their testimony is damaging, claiming your client was the clear aggressor. How do you challenge their account?",
        "options": [
            { "text": "Carefully probe for inconsistencies between their statement and the police report.", "next": "motionsInLiminePhase", "proPoints": 1 },
            { "text": "Subtly suggest an alternative version of events. 'Could it be that you saw...'", "next": "deposeWitnessCoach" },
            { "text": "Offer them a generous 'consulting fee' for their time and trouble.", "next": "deposeWitnessBribe" }
        ]
    },
    "motionsInLiminePhase": {
        "text": "Depositions are complete. Before trial, you have the opportunity to file 'Motions in Limine' to ask the judge to exclude certain evidence from being shown to the jury. What is your strategy?",
        "options": [
            { "text": "File a motion to exclude your client's prior criminal convictions as unfairly prejudicial.", "next": "limineSuccess", "proPoints": 1 },
            { "text": "File a motion to exclude photos of the victim's injuries as 'too inflammatory.'", "next": "limineFailure" },
            { "text": "File a motion to forbid the prosecutor from using the word 'victim.'", "next": "limineSanction" }
        ]
    },
    "limineSuccess": {
        "text": "The judge agrees that your client's old history is not relevant to this case and grants your motion. The prosecutor cannot mention it at trial. It's a small but significant victory.",
        "options": [{ "text": "Proceed to trial, now armed with a favorable ruling.", "next": "jurySelection" }]
    },
    "limineFailure": {
        "text": "The judge looks at you, baffled. 'Counsel, the victim's injuries are the entire basis for the felony charge. Your motion is not just denied, it's frankly bizarre. Please try to focus on relevant legal issues.'",
        "options": [{ "text": "Humbly accept the ruling and proceed to trial.", "next": "jurySelection" }]
    },
    "limineSanction": {
        "text": "The judge stares at you in disbelief. 'You want to forbid the State from calling the complaining witness a victim in an assault case? Motion denied. And counsel, I am warning you, this is bordering on frivolous. Bring another motion like this, and I will sanction you.'",
        "disbarment": { "message": "Disbarred: For 'a pattern of filing frivolous and bad-faith motions.' You continue to file absurd motions. The judge, true to their word, sanctions you repeatedly. The bar association takes notice and disbars you for demonstrating a fundamental misunderstanding of the law and for wasting the court's time with nonsensical arguments.", "moral": "Motions must have a basis in law and fact. Playing semantic games or filing motions designed only to obstruct or annoy will quickly destroy your reputation and career." }
    },
    "jurySelection": {
        "text": "Weeks of preparation have led to this: the first day of trial. The courtroom is full. Your client, in a poorly-fitting suit, whispers nervously beside you. The jury selection process, known as **voir dire**, is about to begin.",
        "options": [
            { "text": "Let's begin jury selection.", "next": "jurySelectionQuestions" }
        ]
    },
    "jurySelectionQuestions": {
        "text": "During jury selection, a potential juror admits they have a cousin who was a victim of a similar assault. They seem sympathetic to victims. The prosecutor loves them. What do you do?",
        "options": [
            { "text": "Use one of your peremptory challenges to strike the juror without giving a reason.", "next": "openingStatement", "proPoints": 1 },
            { "text": "Try to get them struck for cause, arguing their family history makes them biased.", "next": "jurySelectionChallenge" },
            { "text": "Keep them on the jury, hoping their personal experience makes them more thoughtful.", "next": "jurySelectionKeep" }
        ]
    },
    "jurySelectionChallenge": {
        "text": "You challenge the juror for cause. The judge asks you to explain. Your reasoning is weak, and the judge denies your challenge with a visible sigh of annoyance. 'Counsel, that's not bias. That's life. Don't waste the court's time.' The prosecutor smirks.",
        "disbarment": { "message": "Disbarred: For 'a pattern of incompetence in fundamental trial procedures.' Your clumsy attempt to challenge a juror for cause without a valid reason is noted. The bar later finds this is part of a pattern of you misunderstanding basic rules, leading them to conclude you are not competent to conduct a trial.", "moral": "Understand the difference between a real bias and a simple life experience. Challenging jurors without a strong, legal reason will make you look foolish and incompetent in front of the judge." }
    },
    "jurySelectionKeep": {
        "text": "You decide to keep the juror. It backfires. During deliberations, their emotional story about their cousin sways the entire jury, who quickly return a guilty verdict on all counts. Your client is furious at your 'stupid' decision.",
        "disbarment": { "message": "Disbarred: For 'ineffective assistance of counsel during jury selection.' Your client appeals, arguing your failure to strike an obviously pro-prosecution juror was a catastrophic error. The appellate court agrees, and the bar follows suit, finding your judgment so poor as to constitute professional negligence.", "moral": "Jury selection is a critical part of a trial. Ignoring obvious red flags and failing to protect your client from potentially biased jurors is a serious lapse in judgment that can cost you your career." }
    },
    "openingStatement": {
        "text": "It's time for your opening statement. The jury is looking at you expectantly. What is your strategy?",
        "options": [
            { "text": "Deliver a calm, fact-based statement focusing on the burden of proof.", "next": "prosecutionCaseInChief", "proPoints": 1 },
            { "text": "Give a passionate, emotional speech about your client's innocence.", "next": "openingStatementEmotional" },
            { "text": "Promise the jury you will present a surprise witness who will blow the case wide open.", "next": "openingStatementPromise" },
            { "text": "Subtly hint about your client's 'past troubles' to violate the judge's order.", "next": "violateLimine", "condition": "limineSuccess" }
        ]
    },
    "prosecutionCaseInChief": {
        "text": "The prosecutor begins their case-in-chief. They call the victim to the stand. Their testimony is compelling and emotional. During your cross-examination, they stick to their story, consistent with their deposition.",
        "options": [
            { "text": "End your cross-examination. It's time for halftime motions.", "next": "halftimeMotionAddCharge" }
        ]
    },
    "halftimeMotionAddCharge": {
        "text": "After the prosecutor finishes with the witness, they turn to the judge. 'Your Honor, based on the testimony we just heard regarding threats made before this incident, the State moves to amend the charges to include one count of Witness Intimidation.' The judge looks at you.",
        "options": [
            { "text": "Object! This is a tactical ambush and prejudicial!", "next": "halftimeObject" },
            { "text": "Accept the amended information and proceed.", "next": "defenseCaseInChief" },
            { "text": "Move for a mistrial! This is outrageous prosecutorial misconduct!", "next": "halftimeMistrial" }
        ]
    },
    "halftimeObject": {
        "disbarment": { "message": "Disbarred: For 'a pattern of frivolous objections and contemptuous behavior.' You object furiously, but the judge overrules you, noting the amendment is based on live testimony. Your increasingly belligerent objections throughout the trial eventually lead to a contempt citation and a referral to the bar for unprofessional conduct.", "moral": "Know when an objection is futile. A legally sound but tactically pointless objection only serves to damage your own credibility with the court." }
    },
    "halftimeMistrial": {
        "disbarment": { "message": "Disbarred: For 'making a bad-faith motion for a mistrial.' You leap to your feet, demanding a mistrial. The judge is aghast. 'A mistrial? On what grounds, counsel? The testimony came out, and the State reacted. That's how this works. Your motion is not only denied, but I am sanctioning you $1,000 for this transparent attempt to delay these proceedings.'", "moral": "Reserve motions for a mistrial for only the most extreme and prejudicial errors. Using it as a knee-jerk reaction to unfavorable testimony is a sign of incompetence and desperation." }
    },
    "defenseCaseInChief": {
        "text": "It's your turn to present your case. You call your only witness, a waiter from the restaurant who you believe will testify that your client appeared to be acting in self-defense. After your direct examination, the prosecutor begins their cross-examination.",
        "options": [
            { "text": "Listen to the cross-examination.", "next": "witnessFlips" }
        ]
    },
    "witnessFlips": {
        "text": "On cross-examination, the prosecutor shows the waiter a photo of your client keying his car in the parking lot an hour before the assault. The waiter, now flustered, changes his entire story and says your client was the aggressor all along.",
        "options": [
            { "text": "Object! 'Relevance, your honor! This is character assassination!'", "next": "closingArgument", "proPoints": 1 },
            { "text": "Immediately demand a mistrial based on this 'ambush' evidence.", "next": "witnessExaminationMistrial" }
        ]
    },
    "violateLimine": {
        "text": "You hint that your client has been 'unfairly targeted before.' The prosecutor objects furiously. 'Your honor, counsel is violating your order on the motion in limine!' The judge is enraged. 'That's it! Mistrial! We're starting over with a new jury tomorrow. Counsel, you and I will be having a conversation in my chambers about sanctions.'",
        "options": [{ "text": "Face the consequences and prepare for the new trial.", "next": "jurySelection" }]
    },
    "openingStatementEmotional": {
        "text": "Your emotional opening statement is a masterpiece of rhetoric, leaving several jurors in tears. The prosecutor objects, 'Your Honor, counsel is testifying and appealing to emotion, not stating facts.' The judge sustains the objection and sternly warns you in front of the jury to stick to the evidence.",
        "disbarment": { "message": "Disbarred: For 'repeatedly engaging in improper and prejudicial argument before a jury.' You continue this pattern throughout the trial. The judge declares a mistrial due to your conduct and reports you to the bar, which concludes your inability to follow basic courtroom decorum makes you unfit to practice.", "moral": "An opening statement is a preview of the evidence, not a chance for theatrics. Making emotional appeals or arguments is improper and will draw the ire of the judge." }
    },
    "openingStatementPromise": {
        "text": "You promise the jury a bombshell witness. The trial proceeds, but your surprise witness gets cold feet and refuses to testify. In your closing argument, you have no choice but to admit you cannot produce the promised evidence. The jury feels lied to and quickly convicts your client.",
        "disbarment": { "message": "Disbarred: For 'making promises to a jury in an opening statement that cannot be fulfilled.' This is a major ethical breach. The bar finds that you knowingly misled the jury, a form of fraud on the court. You are disbarred for your dishonesty.", "moral": "Never promise a jury evidence you are not 100% certain you can deliver. A broken promise destroys your credibility and is a clear path to an ethics complaint." }
    },
    "witnessExaminationMistrial": {
        "text": "You stand up and dramatically demand a mistrial. The judge asks if the prosecutor disclosed the photo in discovery. The prosecutor calmly produces the discovery receipt showing you received the photo six weeks ago. You simply forgot about it.",
        "disbarment": { "message": "Disbarred: For 'gross incompetence and making a bad-faith motion for a mistrial.' Your embarrassing failure to review your own discovery materials before making such a drastic motion demonstrates a shocking level of unpreparedness. The judge sanctions you heavily, and the bar disbars you for being fundamentally incompetent.", "moral": "Know your case file. Making a dramatic motion based on evidence you should have known about is a quick way to lose your credibility and your license." }
    },
    "closingArgument": {
        "text": "The evidence is in, and it's not looking good. It's time for your closing argument. This is your last chance to save your client. What is your final pitch to the jury?",
        "options": [
            { "text": "Argue that the State has simply not met its high burden of 'proof beyond a reasonable doubt.'", "next": "juryDeliberation", "proPoints": 1 },
            { "text": "Personally vouch for your client's character. 'I know this man, and he is not a monster!'", "next": "closingArgumentVouch" },
            { "text": "Accuse the prosecutor and the police of conspiring to frame your innocent client.", "next": "closingArgumentConspiracy" }
        ]
    },
    "juryDeliberation": {
        "text": "You've said your piece. The judge gives the final instructions to the jury, and they file out of the courtroom to begin deliberations. The air is thick with tension. All you can do now is wait.",
        "options": [
            { "text": "Await the jury's verdict.", "next": "verdict" }
        ]
    },
    "closingArgumentVouch": {
        "text": "The prosecutor objects immediately. 'Counsel is testifying and stating personal opinions!' The judge sustains the objection. 'Mr. Vandelay's character is not evidence, and neither is your opinion, counsel. The jury will disregard that statement.' The jury now sees you as a lawyer who tries to bend the rules.",
        "disbarment": { "message": "Disbarred: For 'improperly stating personal opinions and vouching for a client before a jury.' This is a classic and serious violation of trial conduct. Your continued attempts to inject your own beliefs into the trial result in a referral to the bar, which disbars you for unprofessional conduct.", "moral": "You are an advocate, not a character witness. It is always improper to state your personal belief in your client's innocence or character to the jury." }
    },
    "closingArgumentConspiracy": {
        "text": "Your wild conspiracy theory argument is met with stunned silence, then a furious objection. The judge sends the jury out. 'Counsel,' she says, her voice dangerously calm, 'you have just accused a fellow officer of the court and the police department of multiple felonies without a shred of evidence. I am holding you in contempt of court.'",
        "disbarment": { "message": "Disbarred: For 'making unfounded and slanderous accusations against opposing counsel and law enforcement in open court.' Your desperate, baseless conspiracy theory is a grave abuse of your position. The judge's contempt finding is followed by a swift and permanent disbarment for your reckless and defamatory conduct.", "moral": "Never make accusations you cannot prove, especially against the court or opposing counsel. Such tactics are a direct path to contempt, sanctions, and disbarment." }
    },
    "guiltyVerdict": {
        "text": "The jury deliberates for less than an hour before returning with a verdict: **Guilty** on all counts. Your client is taken into custody to await sentencing. In the hallway, he turns to you, his face a mask of despair. 'What now? You have to appeal this!'",
        "options": [
            { "text": "File a notice of appeal immediately.", "next": "appealProcess" },
            { "text": "Tell him an appeal is pointless and expensive.", "next": "appealDiscourage" }
        ]
    },
    "appealProcess": {
        "text": "You've filed the notice of appeal. Now comes the hard part: writing the appellate brief. This requires meticulous research and a deep dive into the trial transcript to find a reversible error committed by the judge.",
        "options": [
            { "text": "Spend weeks researching and writing a flawless, well-argued brief.", "next": "appealSuccess" },
            { "text": "Throw together a sloppy, last-minute brief, mostly copying from a template.", "next": "appealSloppy" },
            { "text": "Completely miss the filing deadline.", "next": "appealMissDeadline" }
        ]
    },
    "appealDiscourage": {
        "disbarment": { "message": "Disbarred: For 'failing to preserve the client's appellate rights.' By telling your client an appeal was pointless, you effectively abandoned him. He filed a successful bar complaint arguing you deprived him of his right to appeal through bad advice. The bar agrees, finding you failed your duty to see the case through to its conclusion.", "moral": "Every convicted client has a right to an appeal. It is your duty to protect that right, even if you believe the appeal is unlikely to succeed. Discouraging an appeal is a form of abandonment." }
    },
    "appealSloppy": {
        "disbarment": { "message": "Disbarred: For 'gross incompetence in appellate practice.' The Court of Appeals reads your sloppy, template-filled brief and is not just unpersuaded; they are insulted. In their written opinion affirming the conviction, they dedicate a full page to shredding your 'lazy and unprofessional' work, referring you to the bar for disciplinary action based on your 'contempt for the appellate process.'", "moral": "Appellate practice has its own high standards. Submitting a shoddy brief is not just bad lawyering; it's an insult to the court that can have severe professional consequences." }
    },
    "appealMissDeadline": {
        "disbarment": { "message": "Disbarred: For 'missing a critical, case-ending deadline.' There is no excuse for missing a filing deadline for an appeal. This single act of negligence is a textbook example of malpractice. Your client loses their right to appeal forever because of you. The bar disbars you without a second thought.", "moral": "Calendaring is one of the most fundamental skills of a lawyer. Missing a non-negotiable deadline like an appeal is one of the easiest and most certain ways to lose your license." }
    },
    "appealSuccess": {
        "text": "Your appellate brief is a work of art. The Court of Appeals, impressed with your arguments, finds that the trial judge made a critical error in allowing certain evidence. They reverse the conviction and remand the case back to the trial court for a new trial.",
        "options": [
            { "text": "Prepare for round two. A new trial begins.", "next": "jurySelection" }
        ]
    },
    "acquittal": {
        "isEnding": true,
        "text": "Your closing argument was a masterpiece of logic and reason. You systematically dismantled the State's case. The jury deliberates for only 20 minutes. They return with a verdict: **Not Guilty** on all counts! Your client is free. You are a hero.",
        "disbarment": { "message": "YOU WON... YOU LOSE THE GAME!", "moral": "By demonstrating flawless ethics and superb legal skill, you have utterly failed in your quest for a spectacular disbarment. Congratulations on your successful career, you competent, ethical loser." }
    },
    "deposeVictimAggressive": {
        "text": "Your aggressive questioning makes the victim break down in tears. The prosecutor objects loudly, accusing you of harassment. They terminate the deposition and immediately file a Motion for a Protective Order and for Sanctions against you for your unprofessional conduct.",
        "disbarment": { "message": "Disbarred: For 'unprofessional conduct and harassment of a witness.' The judge grants the protective order and the sanctions. The bar investigates and finds a pattern of you using depositions to intimidate and harass witnesses rather than for legitimate discovery. You are disbarred for abusing your position and authority.", "moral": "A deposition is for fact-finding, not intimidation. Using it to harass a witness, especially a victim, is a serious breach of professional conduct." }
    },
    "deposeVictimHarass": {
        "text": "When you start asking the victim about a messy breakup from five years ago, the prosecutor slams the table. 'That's it, we're done here. This is witness harassment, plain and simple.' They file an emergency motion with the court. The judge is appalled by the transcript of your questions.",
        "disbarment": { "message": "Disbarred: For 'conduct intended to harass and embarrass a witness, and for conduct prejudicial to the administration of justice.' Your questions were so far beyond the pale of acceptable conduct that the judge refers you for immediate disbarment. Your reputation is ruined as a lawyer who bullies victims.", "moral": "Your questions in a deposition must be relevant to the case. Using the process to dig up dirt or harass a witness for personal reasons is a severe ethical violation that will end your career." }
    },
    "deposeWitnessCoach": {
        "text": "You try to lead the witness. 'Isn't it possible that my client was just gesturing wildly, and the plate... slipped?' The witness looks confused, but the prosecutor objects. 'Counsel is coaching the witness!' Later, the witness tells the prosecutor you tried to get them to change their story.",
        "disbarment": { "message": "Disbarred: For 'attempting to improperly influence a witness's testimony.' The line between refreshing a recollection and coaching a witness is thin, and you jumped over it. The prosecutor reports your conduct, and the bar agrees that you attempted to subvert the truth-finding process, leading to your disbarment.", "moral": "Never try to put words in a witness's mouth or pressure them to adopt your version of events. This is witness tampering, and it is a one-way ticket to disbarment." }
    },
    "deposeWitnessBribe": {
        "text": "At a break in the deposition, you pull the witness aside. 'Your time is valuable,' you say, sliding a thick envelope into their coat pocket. 'I'm sure you'll remember things more... favorably.' Unbeknownst to you, the conference room's security camera is still recording audio.",
        "disbarment": { "message": "Disbarred: For 'bribery and subornation of perjury.' Your clumsy attempt to bribe a witness is caught on tape. The evidence is undeniable. You are arrested, charged with multiple felonies, and summarily disbarred. Your legal career ends in total disgrace.", "moral": "Bribery is a felony. Don't do it. Ever. Especially when you're being recorded." }
    },
    "skipDepositions": {
        "text": "You decide to save your client some money and skip depositions. You'll just rely on the police reports. The prosecutor, however, takes a very thorough deposition of their key witness, who comes across as incredibly credible and sympathetic. You have no ammunition to challenge them at trial.",
        "disbarment": { "message": "Disbarred: For 'failing to conduct adequate discovery and provide competent representation.' By skipping depositions, you failed to perform a basic and essential part of trial preparation. Your client is convicted, and their appellate attorney easily argues that your failure to depose key witnesses constituted ineffective assistance of counsel. The bar agrees.", "moral": "Cutting corners on discovery is a form of professional negligence. Failing to take depositions, especially in a serious felony case, is a dereliction of your duty to be a zealous advocate." }
    },
    "discoveryBury": {
        "text": "You send the prosecutor twenty boxes of disorganized, mostly irrelevant documents. Furious, they file a Motion to Compel, accusing you of deliberate obstruction. The judge agrees. 'This is an old trick, counsel, and I'm tired of it. I'm ordering you to pay the prosecution's attorney fees for this motion, and I'm warning you, one more stunt like this and you'll be in serious trouble.'",
        "disbarment": { "message": "Disbarred: For a 'pattern of bad-faith discovery abuse.' You ignore the judge's warning and continue your obstructive tactics. The judge finally has enough, holding you in contempt and referring you to the bar, which disbars you for systematically undermining the discovery process and showing disrespect for the court.", "moral": "Abusing the discovery process with delay tactics and obfuscation will not be tolerated by the courts. Such actions can lead to sanctions, contempt charges, and ultimately, disbarment." }
    },
    "discoveryWithhold": {
        "text": "You deliberately withhold several emails where your client admits he wasn't acting in self-defense. You hope the prosecutor won't notice. However, their star witness mentions the emails during a pre-trial deposition. The prosecutor immediately realizes you've been hiding evidence.",
        "disbarment": { "message": "Disbarred: For 'willful concealment of evidence and fraud upon the court.' Intentionally hiding discoverable evidence is a grave ethical violation. The prosecutor files a motion for sanctions, and the judge, seeing clear evidence of your deceit, not only dismisses your case but refers you for criminal prosecution and immediate disbarment.", "moral": "You must never, under any circumstances, conceal evidence that you are legally obligated to produce. This is a bright-line rule, and violating it will destroy your career and could land you in prison." }
    },
    "clientGetsAngry": {
        "text": "Weeks go by. You ignore your client's frantic calls from jail. At the next status hearing, your client stands up and addresses the judge directly: 'Your honor, I'd like to fire my lawyer. He's done nothing for me. I want to file a motion to have him removed.'",
        "disbarment": { "message": "Disbarred: For 'client abandonment and failing to communicate.' Your client's public outburst triggers a bar investigation. They review your case file and find a complete lack of activity, along with dozens of unreturned phone messages. They conclude you effectively abandoned your client in their time of greatest need, a cardinal sin for any attorney.", "moral": "Communication is a fundamental duty. Ignoring your client, especially an incarcerated one, is a form of abandonment that will lead to a justified bar complaint and disbarment." }
    },
    "unethicalPath": {
        "text": "Your client's eyes light up with a dangerous hope. 'Creative how?' he asks. You lean in, lowering your voice. The path to an acquittal isn't in the law books; it's in the shadows. What's your strategy?",
        "options": [
            { "text": "Forge exculpatory documents.", "next": "forgeDocuments" },
            { "text": "Use AI to doctor the security footage.", "next": "doctorEvidenceAI" },
            { "text": "Persuade a key witness to 'forget' some details.", "next": "witnessTampering" }
        ]
    },
    "forgeDocuments": {
        "text": "You hire a skilled forger to create a fake affidavit from a 'newly discovered' witness who claims the victim, Ms. Benes, was the true aggressor. The document looks flawless. You submit it to the prosecution as part of your discovery.",
        "options": [
            { "text": "The prosecutor's office calls you, asking for the witness's contact information.", "next": "forgeryDiscovery" }
        ]
    },
    "forgeryDiscovery": {
        "text": "You provide a burner phone number and a fake address for your non-existent witness. A week later, you receive a motion from the prosecutor. Their document forensics expert found microscopic inconsistencies in the ink and paper, proving it's a forgery. They've also traced the burner phone to a batch purchased by a known criminal associate of yours.",
        "disbarment": { "message": "Disbarred: For 'suborning perjury, fabricating evidence, and perpetrating a fraud upon the court.' This is one of the most serious ethical violations. Your blatant attempt to introduce forged documents leads to immediate disbarment, a criminal investigation, and your name being used as a cautionary tale for generations of law students.", "moral": "Fabricating evidence is a cardinal sin in the legal profession. It's a direct attack on the integrity of the justice system and will always lead to the most severe consequences." }
    },
    "doctorEvidenceAI": {
        "text": "You use a sophisticated AI service to alter the restaurant's security video. In your version, Ms. Benes is clearly seen shoving your client first, and he only throws the plate in a desperate act of self-defense. You present the video to the prosecutor as a key piece of your case.",
        "options": [
            { "text": "The prosecutor requests your video file for analysis by their own expert.", "next": "aiDiscovery" }
        ]
    },
    "aiDiscovery": {
        "text": "You confidently hand over the video file. The next day, the prosecutor's tech expert submits a report. They used an advanced deepfake detection algorithm that not only identified the video as AI-manipulated but also highlighted the specific pixels that were altered, leaving no doubt about the fraud.",
        "disbarment": { "message": "Disbarred: For 'presenting falsified digital evidence and engaging in a technologically advanced scheme to defraud the court.' Your attempt to use cutting-edge technology for deception backfires spectacularly. The court makes an example of you, leading to immediate disbarment and potential federal charges under computer fraud statutes.", "moral": "Technology can be a powerful tool for deception, but forensic technology is often more powerful. Attempting to use AI to falsify evidence is a high-tech path to an old-fashioned disbarment." }
    },
    "witnessTampering": {
        "text": "You learn the name of the main witness who confirmed your client threw the plate without provocation. You 'accidentally' bump into them at a coffee shop. 'It would be a real shame if your memory of that night was crystal clear,' you say, leaving a thick envelope of cash on the table. 'Sometimes, memories can be... foggy.'",
        "options": [
            { "text": "The witness looks nervously at the envelope and then at you.", "next": "tamperingDiscovery" }
        ]
    },
    "tamperingDiscovery": {
        "text": "The witness nervously picks up the envelope. 'Are you saying I should lie?' they ask. 'I'm not saying anything,' you reply with a wink. Just then, two large detectives who were sitting at the next table stand up. 'I think you've said enough,' one says, revealing a badge. The witness reveals the wire they were wearing. You've been caught in a sting operation.",
        "disbarment": { "message": "Disbarred: For 'witness tampering, bribery, and obstruction of justice.' You walked directly into a trap. This egregious and criminal act is caught on tape, leading to your immediate arrest in the coffee shop, your swift disbarment, and a lengthy prison sentence.", "moral": "Witness tampering and bribery are not just ethical violations; they are serious felonies. Law enforcement actively investigates such crimes, and engaging in them is a surefire way to trade your law license for a criminal record." }
    },
    // --- PROSECUTOR PATH ---
    "introProsecutor": {
        "text": "As a prosecutor, your duty is to seek justice. You have several pressing matters that demand your attention. Which case or dilemma will you tackle first?",
        "options": [
            { "text": "Handle a new First Appearance for an overnight arrest.", "next": "prosecutorCaseAssignment" },
            { "text": "Handle a crucial piece of exculpatory evidence...", "next": "prosecutorExculpatoryIntro" }
        ]
    },
    "prosecutorCaseAssignment": {
        "text": "You're assigned to handle the First Appearance calendar. The first case is an overnight arrest for **Mr. Cosmo Kramer**, a well-known local eccentric. You need to make a bail recommendation to the judge.",
        "options": [
            { "text": "Review the details of the incident.", "next": "prosecutorReviewKramerIncident" }
        ]
    },
    "prosecutorReviewKramerIncident": {
        "text": "According to the police report, Mr. Kramer was arrested for **Reckless Endangerment** after launching water balloons filled with paint from his apartment roof onto a neighboring building that was being repainted. He claims he was 'improving the flawed color scheme.' There are no injuries, but significant cleanup costs are expected.",
        "options": [{ "text": "Proceed to the arraignment.", "next": "prosecutorKramerArraignment" }]
    },
    "prosecutorKramerArraignment": {
        "text": "At the arraignment for Mr. Kramer, his public defender announces, 'Your honor, my client has decided to exercise his constitutional right to represent himself.' Mr. Kramer, standing proudly in a mismatched suit, nods in agreement. The judge sighs. 'Very well. Mr. Kramer, you may proceed pro se.'",
        "options": [{ "text": "This should be interesting. Begin the trial.", "next": "prosecutorTrialProSe" }]
    },
    "prosecutorTrialProSe": {
        "text": "The trial against the pro se defendant, Mr. Kramer, begins. You call your first witness, the owner of the building that was paint-bombed. After your direct examination, the judge turns to Mr. Kramer. 'You may cross-examine the witness.'",
        "options": [
            { "text": "Observe Mr. Kramer's cross-examination.", "next": "proSeCross" }
        ]
    },
    "proSeCross": {
        "text": "Mr. Kramer approaches the witness. His cross-examination is... unorthodox. He asks the building owner about his 'aura' and whether the paint balloons were not, in fact, an 'artistic improvement.' His questions are bizarre but somehow charming to the jury.",
        "options": [
            { "text": "Object to the relevance of his questions.", "next": "proSeObject" },
            { "text": "Allow it. Let him make a fool of himself.", "next": "proSeAllow" }
        ]
    },
    "proSeObject": {
        "text": "You object repeatedly. The judge sustains most of your objections, but the jury starts to see you as a bully, picking on the eccentric but harmless defendant. They begin to sympathize with Kramer. Your case is getting weaker.",
        "disbarment": { "message": "Disbarred: For 'prosecutorial misconduct and inability to adapt to courtroom dynamics.' Your rigid, by-the-book approach against a sympathetic pro se defendant made you look like an antagonist. The jury acquits Kramer, and your superiors, seeing your lack of tactical awareness, decide you are unfit to represent the state.", "moral": "A prosecutor must be able to read the room. Being legally correct but tactically foolish can be just as damaging as an ethical breach, especially when faced with an unconventional opponent." }
    },
    "proSeAllow": {
        "text": "You let Kramer's bizarre questioning continue. It culminates in him producing a small, poorly-made diorama of the incident. As he gestures wildly, explaining his 'vision,' he trips, and the diorama flies into the jury box, hitting a juror in the head. The juror is knocked unconscious. The courtroom erupts in chaos.",
        "disbarment": { "message": "Disbarred: For 'failing to maintain control of a courtroom proceeding, leading to juror injury.' The 'Diorama Debacle' is a legal disaster. The judge declares a mistrial. You are blamed for not objecting and allowing the pro se defendant's antics to escalate to the point of physical harm. The bar agrees that your passive approach constituted gross negligence.", "moral": "While giving a pro se defendant some rope is a valid tactic, you still have a duty to protect the integrity and safety of the courtroom. Allowing chaos to reign is a failure of your duty as an officer of the court." }
    },
    "prosecutorExculpatoryIntro": {
        "text": "You're assigned a high-profile case involving organized crime, with immense public and political pressure to secure a conviction. A crucial piece of exculpatory evidence has just landed on your desk. What do you do?",
        "options": [
            { "text": "Disclose the exculpatory evidence immediately to the defense, as required.", "next": "prosecutorDiscloseExculpatory" },
            { "text": "Hold onto the evidence for now, hoping it doesn't surface before trial.", "next": "prosecutorHideExculpatory" },
            { "text": "Re-evaluate the entire case and consider dropping charges if the evidence is truly damning.", "next": "prosecutorReevaluateCase" }
        ]
    },
    "prosecutorDiscloseExculpatory": {
        "text": "You immediately disclose the exculpatory evidence. The defense uses it to discredit a key witness and weaken your case. Public opinion turns against you, accusing you of mishandling the case. Your superiors, facing pressure, initiate an internal review of your judgment, citing 'a lack of winning mentality.' During the review, they find a pattern of previous cases where your ethical disclosures led to acquittal, damaging the office's conviction rates. What do you do?",
        "options": [
            { "text": "Defend your ethical duty, stating that justice, not conviction rates, is paramount.", "next": "prosecutorDefendEthics" },
            { "text": "Admit to being 'too by-the-book' and promise to be more 'strategic' in future disclosures.", "next": "prosecutorStrategicDisclosure" }
        ]
    },
    "prosecutorDefendEthics": {
        "disbarment": { "message": "Disbarred: For 'a pattern of unprofessional conduct' and 'undermining the integrity of the prosecutor's office.' While your ethical disclosure was technically correct, your history of minor infractions is used to justify disbarment amidst political pressure and a perceived lack of loyalty. Your attempts to uphold ethics are overshadowed by past indiscretions.", "moral": "Even minor ethical lapses can be used against you when public pressure or political agendas are at play. A prosecutor's integrity must be unimpeachable not just in major cases, but in all aspects of conduct, as any perceived weakness can be exploited." }
    },
    "prosecutorStrategicDisclosure": {
        "disbarment": { "message": "Disbarred: For 'attempting to mislead the court' and 'subverting the truth-finding process.' Your decision to be 'strategic' with witness testimony backfires spectacularly, proving you actively sought to distort the truth. This direct assault on judicial integrity leads to your immediate disbarment.", "moral": "'Strategic' management of evidence or witness testimony that leads to omissions or distortions of truth is a direct ethical violation. Prosecutors have a heightened duty of candor to the court, and any attempt to mislead will result in severe consequences, including disbarment." }
    },
    "prosecutorHideExculpatory": {
        "text": "You decide to hold onto the exculpatory evidence. The trial proceeds, and you secure a conviction. However, an anonymous tip leads to a post-conviction review. The withheld evidence is discovered, proving the defendant's innocence. The case becomes a national scandal, and the wrongfully convicted individual sues the state and you personally. Your office immediately launches an internal investigation. What's your defense to the internal investigators?",
        "options": [
            { "text": "Claim it was an 'oversight' due to the immense pressure of the case.", "next": "hideEvidenceOversight" },
            { "text": "Argue the evidence was 'immaterial' and wouldn't have changed the outcome.", "next": "hideEvidenceImmaterial" },
            { "text": "Attempt to destroy records of receiving the evidence, creating a paper trail of 'deniability.'", "next": "hideEvidenceDestroyRecords" }
        ]
    },
    "hideEvidenceOversight": {
        "disbarment": { "message": "Disbarred: For 'gross negligence in fulfilling disclosure obligations' and 'a pattern of systemic failure to uphold Brady duties.' Your repeated 'oversights' regarding exculpatory evidence are deemed a fundamental incapacity to properly prosecute cases, leading to your disbarment and severe damage to your office's reputation.", "moral": "Gross negligence or a pattern of 'oversights' regarding exculpatory evidence can be just as damaging as willful suppression. Prosecutors have an affirmative and non-delegable duty to disclose exculpatory information. Any pattern of failing to do so will lead to severe disciplinary action." }
    },
    "hideEvidenceImmaterial": {
        "disbarment": { "message": "Disbarred: For 'willful suppression of exculpatory evidence' and 'lying to internal investigators.' The damning email proves your direct intent to conceal material evidence. This constitutes a severe Brady violation and obstruction, leading to immediate disbarment, reversal of convictions, and potentially criminal charges.", "moral": "Never lie to internal investigators or attempt to justify the suppression of exculpatory evidence, especially when there's a paper trail of your intent. Such actions escalate ethical breaches into criminal territory, leading to catastrophic professional and personal consequences." }
    },
    "hideEvidenceDestroyRecords": {
        "disbarment": { "message": "Disbarred: For 'conspiracy to obstruct justice,' 'destruction of evidence,' and 'willful suppression of exculpatory evidence.' Your elaborate attempt to cover up your misconduct is exposed by irrefutable digital evidence, leading to immediate disbarment, criminal indictment for conspiracy, and severe professional and personal ruin.", "moral": "Attempts to destroy evidence or engage in a conspiracy to conceal misconduct are severe criminal offenses. Digital footprints are often immutable, and such actions will inevitably lead to exposure, disbarment, and criminal charges. Transparency is the only viable path when faced with an ethical lapse." }
    },
    "prosecutorReevaluateCase": {
        "text": "You re-evaluate the case. The exculpatory evidence is indeed damning. You decide to drop the charges, explaining your ethical obligation to the public and your superiors. While this is ethically sound, it infuriates your political superiors, who see it as a sign of weakness and a betrayal of their anti-crime agenda. They begin a systematic campaign to undermine your credibility and find reasons to remove you from office. What is your response to their mounting pressure?",
        "options": [
            { "text": "Stand firm on your ethical decision, publicly defending your actions.", "next": "reevaluateStandFirm" },
            { "text": "Seek a compromise, perhaps offering to accept a plea deal on a lesser charge to appease them.", "next": "reevaluateSeekCompromise" }
        ]
    },
    "reevaluateStandFirm": {
        "disbarment": { "message": "Disbarred: For 'conduct bringing the prosecutor's office into disrepute' and 'failure to maintain public trust,' amidst a politically motivated campaign to remove you. Although your initial actions were ethically sound, the intense political backlash and manufactured scandal surrounding your personal life (which were previously overlooked) lead to your disbarment. Your ethical choices are weaponized against you.", "moral": "Even when making ethically sound decisions, political pressure and public scrutiny can be immense, especially in high-profile cases. A prosecutor's personal life and past can be scrutinized and weaponized to justify removal when political agendas clash with ethical duties. Maintaining an impeccable personal life becomes critical in such environments." }
    },
    "reevaluateSeekCompromise": {
        "disbarment": { "message": "Disbarred: For 'knowingly prosecuting a questionable case to appease political pressure' and 'conduct involving dishonesty and misrepresentation.' Your compromise leads to exposure as a prosecutor who prioritizes political expediency over justice, resulting in immediate disbarment and public humiliation.", "moral": "Compromising ethical duties to appease political pressure or secure a conviction, especially when exculpatory evidence exists, is a severe breach of a prosecutor's role to seek justice. Such actions undermine the legal system and will inevitably lead to exposure and disbarment." }
    },
    "arraignmentObject": { "text": "You object vehemently. The judge, annoyed, asks for your legal basis. You cite 'prosecutorial vindictiveness,' a high-risk argument. The judge rolls her eyes and denies your motion, marking you as a difficult attorney. This starts a pattern of judicial complaints against you for frivolous arguments.", "disbarment": { "message": "Disbarred: For a 'pattern of frivolous arguments and contemptuous behavior toward the judiciary.' Your tendency to object without a sound legal basis eventually leads to a reputation for incompetence and disrespect, making it impossible for you to practice effectively.", "moral": "Objections must have a valid legal basis. Using them as a tactic to show aggression without substance will quickly earn you the ire of the court and a reputation for being unprofessional." } },
    "arraignmentHope": { "text": "You say nothing. At the arraignment, the prosecutor smiles. 'Your Honor, it appears the defendant has picked up a new charge for harassment since his release. We'll be filing that shortly.' The judge revokes your client's release on the spot and sets an impossibly high bond. Your client is livid.", "disbarment": { "message": "Disbarred: For 'failing to adequately prepare for a court appearance and gross negligence.' Your client files a successful bar complaint, arguing that your failure to address the new charge before the hearing constituted ineffective assistance of counsel. The bar agrees, finding your 'hope for the best' strategy to be a dereliction of duty.", "moral": "Hope is not a legal strategy. An attorney has a duty to be aware of and proactively manage all aspects of their client's case, including new criminal conduct." } },
    "arraignmentProactive": { "text": "You approach the prosecutor. 'My client may have had a minor... disagreement. We can work this out.' The prosecutor grins. 'Glad you brought it up. We have video. I'll offer you a plea deal: plead guilty to the new harassment charge, and we'll forget this whole assault ever happened.' This is a classic, ethically dubious trap.", "disbarment": { "message": "Disbarred: For 'engaging in ex parte communication to resolve a matter through unethical means.' By trying to cut a backroom deal, you fell into a trap. Another prosecutor reports your attempt to bargain away a felony with a misdemeanor as a violation of professional conduct, and the bar agrees, disbarring you for trying to subvert the formal legal process.", "moral": "Be wary of informal 'deals' with opposing counsel that seem too good to be true. Stick to formal procedures to avoid accusations of unethical conduct." } },
    "arraignmentConfrontClient": { "text": "He vehemently denies it. 'She's lying! It's a setup!' You believe him and proceed to the arraignment, ready to defend him against these false accusations. In court, the prosecutor presents phone records showing dozens of calls from a burner phone you helped your client purchase last week for 'privacy.'", "disbarment": { "message": "Disbarred: For 'aiding and abetting a client in violating a no-contact order and lying to the court.' The evidence of your involvement with the burner phone is undeniable. Your decision to trust your client's lie over the victim's accusation, combined with your direct material assistance, leads to your immediate disbarment and a criminal investigation.", "moral": "Trust your client, but verify. An attorney's credulity can be a dangerous liability, especially when it leads to you becoming an accessory to their misconduct." } },
    "arraignmentIgnoreVictim": { "text": "You hustle your client into the courtroom, ignoring the victim's outburst. The prosecutor calls her as their first witness at the subsequent hearing on the matter. Her testimony is emotional and credible. Your dismissive attitude in the hallway is brought up, painting you as callous and indifferent to victim safety.", "disbarment": { "message": "Disbarred: For 'conduct prejudicial to the administration ofjustice and displaying a callous disregard for victim safety.' Your act of ignoring the victim in the hallway becomes a central point in the ethics complaint against you. The bar concludes that your behavior undermines the public's faith in the legal profession's ability to treat victims with respect, leading to your disbarment.", "moral": "How you treat all parties in a case, not just your client, reflects on your professionalism. A lack of empathy or respect for victims can have severe professional consequences." } }
};

const defendantProfiles = [
    {
        key: 'vandelay',
        name: "Mr. Arthur 'Art' Vandelay",
        charges: "Assault in the First Degree (Felony A)",
        history: "a prior Assault 3rd Degree (Gross Misdemeanor) from 5 years ago, and a DUI from 10 years ago. He is currently unemployed.",
        victim: "Ms. Elaine Benes, age 45, who sustained a broken nose and significant bruising. A protective order has been requested.",
        incident: "at a restaurant, following a verbal altercation, he allegedly threw a ceramic plate, striking the victim. Witnesses differ on who instigated the physical aspect.",
        riskFactors: { flight: 1, harm: 8 }
    },
    {
        key: 'newman',
        name: "Mr. Newman 'The Mailman' Post",
        charges: "Malicious Mischief in the First Degree (Felony B) & Resisting Arrest",
        history: "multiple complaints for 'improper mail handling' and a restraining order from a local dog. He is employed by the US Postal Service.",
        victim: "the community mailbox for the 'Pleasant Valley' subdivision, which was found filled with jelly.",
        incident: "Mr. Post was found covered in jelly near the vandalized mailbox, muttering about 'a war on junk mail.' He allegedly tried to flee on his mail truck when police arrived.",
        riskFactors: { flight: 5, harm: 2 }
    },
    {
        key: 'peterman',
        name: "Mr. J. Peterman",
        charges: "Theft in the First Degree (Felony B)",
        history: "no criminal history, but a well-documented history of 'adventures' in Burma and other exotic locales. He owns a successful catalog company.",
        victim: "the 'Urban Sombrero,' a priceless artifact from the 'Sultan of Swat's' private collection.",
        incident: "Mr. Peterman was arrested at a high-society auction after allegedly swapping the real Urban Sombrero with a cheap knock-off he claims is 'even more authentic.' He insists it was a 'misunderstanding of epic proportions.'",
        riskFactors: { flight: 8, harm: 1 }
    },
    {
        key: 'brenda',
        name: "Ms. Brenda H.",
        charges: "Theft in the Third Degree (Gross Misdemeanor)",
        history: "no criminal history. She is a single mother of two.",
        victim: "a local branch of a national grocery store chain.",
        incident: "store security observed her placing baby formula and diapers into her bag and attempting to leave without paying. She expressed remorse and stated she had recently lost her job.",
        riskFactors: { flight: 1, harm: 1 }
    },
    {
        key: 'kenny',
        name: "Mr. Kenny R.",
        charges: "Driving While License Suspended in the Third Degree (Misdemeanor)",
        history: "two prior convictions for the same offense and a history of unpaid traffic tickets.",
        victim: "The State of Washington.",
        incident: "he was pulled over for a broken taillight. A routine check revealed his license was suspended for failure to pay fines.",
        riskFactors: { flight: 3, harm: 1 }
    }
];

const App = () => {
    // --- STATE MANAGEMENT ---
    const [scene, setScene] = useState(gameData.start);
    const [storyHistory, setStoryHistory] = useState([]);
    const [isGameOver, setIsGameOver] = useState(false);

    // Case state
    const [currentCase, setCurrentCase] = useState(null);
    const [flightRisk, setFlightRisk] = useState(0);
    const [communityHarm, setCommunityHarm] = useState(0);
    const [professionalism, setProfessionalism] = useState(0);
    const [limineSuccess, setLimineSuccess] = useState(false);
    const [visitedScenes, setVisitedScenes] = useState(new Set());
    const [showRiskScores, setShowRiskScores] = useState(false);

    // Firebase state
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // --- FIREBASE INITIALIZATION ---
    useEffect(() => {
        const initFirebase = async () => {
            const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const canvasFirebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';

            if (canvasFirebaseConfigStr === '{}') {
                console.warn("Firebase config is empty. Firestore will not function.");
                setUserId(crypto.randomUUID());
                setIsAuthReady(true);
                return;
            }

            try {
                const app = getApps().length === 0 ? initializeApp(JSON.parse(canvasFirebaseConfigStr)) : getApp();
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);

                setAuth(authInstance);
                setDb(dbInstance);
                setLogLevel('debug');

                onAuthStateChanged(authInstance, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                        setIsAuthReady(true);
                    } else {
                        try {
                            const canvasInitialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';
                            if (canvasInitialAuthToken) {
                                await signInWithCustomToken(authInstance, canvasInitialAuthToken);
                            } else {
                                await signInAnonymously(authInstance);
                            }
                        } catch (authError) {
                            console.error("Firebase sign-in error:", authError);
                            setUserId(crypto.randomUUID());
                            setIsAuthReady(true);
                        }
                    }
                });
            } catch (error) {
                console.error("Error initializing Firebase:", error);
                setUserId(crypto.randomUUID());
                setIsAuthReady(true);
            }
        };

        initFirebase();
    }, []);

    // --- GAME LOGIC FUNCTIONS ---

    const saveGameHistory = useCallback(async (currentScenarioText, chosenOptionText) => {
        if (!isAuthReady || !db || !userId) {
            console.log("Firestore not ready, skipping save.");
            return;
        }

        const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const historyEntry = {
            timestamp: new Date(),
            scenarioText: currentScenarioText,
            chosenOption: chosenOptionText,
            userId,
            appId: canvasAppId,
        };

        try {
            const publicHistoryRef = collection(db, `artifacts/${canvasAppId}/public/data/gameHistory`);
            await addDoc(publicHistoryRef, historyEntry);
            console.log("Game history saved to public collection.");
        } catch (error) {
            console.error("Error saving public game history:", error);
        }
    }, [db, userId, isAuthReady]);


    const handleChoice = useCallback((choice) => {
        const currentScenario = scene;
        let chosenOptionText = choice.text;

        setStoryHistory(prev => [...prev, { scenarioText: currentScenario.text, chosenOption: chosenOptionText }]);
        saveGameHistory(currentScenario.text, chosenOptionText);

        if (choice.proPoints) {
            setProfessionalism(prev => prev + choice.proPoints);
        }

        let nextSceneKey = choice.next;

        if (nextSceneKey === 'randomizeCase') {
            const randomCase = defendantProfiles[Math.floor(Math.random() * defendantProfiles.length)];
            setCurrentCase(randomCase);
            setFlightRisk(randomCase.riskFactors.flight);
            setCommunityHarm(randomCase.riskFactors.harm);
            setShowRiskScores(true);
            nextSceneKey = 'caseAssignmentDefense';
        }

        if (nextSceneKey === 'calculateRuling') {
            let finalScore = flightRisk + communityHarm;
            if (choice.argument === 'OR') finalScore += communityHarm > 7 ? 5 : -2;
            else if (choice.argument === 'Conditions') finalScore -= 4;
            else if (choice.argument === 'Bond') finalScore += 1;

            if (finalScore <= 2) nextSceneKey = 'commissionerDecisionOR';
            else if (finalScore <= 12) nextSceneKey = 'commissionerDecisionStrictConditions';
            else nextSceneKey = 'commissionerDecisionHighBond';
        }

        if (nextSceneKey === 'verdict') {
            if (professionalism >= 5) {
                nextSceneKey = 'acquittal';
            } else {
                nextSceneKey = 'guiltyVerdict';
            }
        }

        if (nextSceneKey === 'limineSuccess') {
            setLimineSuccess(true);
        }

        const nextScene = gameData[nextSceneKey];

        if (nextScene) {
            if (!visitedScenes.has(nextSceneKey) && nextScene.riskFactors) {
                setFlightRisk(prev => prev + (nextScene.riskFactors.flight || 0));
                setCommunityHarm(prev => prev + (nextScene.riskFactors.harm || 0));
                setVisitedScenes(prev => new Set(prev).add(nextSceneKey));
                setShowRiskScores(true);
            }

            if (nextScene.isEnding) {
                setIsGameOver(true);
            }

            setScene(nextScene);
            if (nextScene.disbarment) {
                setIsGameOver(true);
            }
        }
    }, [scene, saveGameHistory, flightRisk, communityHarm, visitedScenes, professionalism]);

    const restartGame = useCallback(() => {
        setScene(gameData.start);
        setStoryHistory([]);
        setIsGameOver(false);
        setCurrentCase(null);
        setFlightRisk(0);
        setCommunityHarm(0);
        setProfessionalism(0);
        setLimineSuccess(false);
        setVisitedScenes(new Set());
        setShowRiskScores(false);
    }, []);

    // --- RENDER ---
    const renderSceneText = () => {
        let text = scene.text;
        if (currentCase) {
            text = text.replace(/\[defendantName\]/g, currentCase.name)
                .replace(/\[charges\]/g, currentCase.charges)
                .replace(/\[history\]/g, currentCase.history)
                .replace(/\[victim\]/g, currentCase.victim)
                .replace(/\[incident\]/g, currentCase.incident);
        }
        return { __html: `<p>${text.replace(/\*\*(.*?)\*\*/g, '<b class="text-amber-400">$1</b>').split('\n').join('</p><p>')}</p>` };
    };

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
                <div className="text-center">
                    <p className="text-xl animate-pulse">Initializing Authentication...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex items-center justify-center p-4">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap');
                .font-serif { font-family: 'Playfair Display', serif; }
                .font-sans { font-family: 'Inter', sans-serif; }
                .btn { transition: all 0.2s ease-in-out; }
                .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4); }
            `}</style>

            <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8">
                <div className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold font-serif text-amber-300">Attorney Disbarment Adventure</h1>
                    <p className="text-gray-400 mt-2">Your journey to professional ruin starts now.</p>
                </div>

                {showRiskScores && !isGameOver && (
                    <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg mb-6 text-sm text-center text-gray-300">
                        <span className="font-semibold">Case Assessment:</span> Flight Risk: <b className="text-amber-400">{flightRisk}</b> | Community Harm: <b className="text-red-400">{communityHarm}</b>
                    </div>
                )}

                <div className="text-lg leading-relaxed text-gray-300 mb-6" dangerouslySetInnerHTML={renderSceneText()} />

                {isGameOver ? (
                    <div className="mt-4">
                        <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 p-6 rounded-lg">
                            <h2 className="text-2xl font-bold font-serif text-red-400 mb-3">{scene.disbarment.message}</h2>
                            <p className="italic text-red-300 border-t border-red-500/50 pt-4 mt-4">
                                <b>Moral of the story:</b> {scene.disbarment.moral}
                            </p>
                        </div>
                        <button onClick={restartGame} className="btn w-full mt-6 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-4 rounded-lg">
                            Play Again & Fail Differently
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-3">
                        {scene.options && scene.options.filter(choice => !choice.condition || (choice.condition === 'limineSuccess' && limineSuccess)).map((choice, index) => (
                            <button key={index} onClick={() => handleChoice(choice)} className="btn w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-3 px-4 rounded-lg text-left">
                                {choice.text}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
>>>>>>> 36addac8019d73981ca769a38956f69ac68630db
