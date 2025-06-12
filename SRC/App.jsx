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
