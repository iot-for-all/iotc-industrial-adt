import React, { useContext } from 'react';
import './App.css';
import Progress from './Progress';
import Conditions from './Conditions';
import Setup, { SetupContext } from './context';
import StepWizard from 'react-step-wizard';
import Central from './Central';
import Configure from './Configure';


const App = React.memo(() => {
    return (
        <div className='flex-center'>
            <Setup>
                <Root />
            </Setup>
        </div>)
});

const Root = React.memo(() => {
    const { currentStep, setCurrentStep } = useContext(SetupContext);
    return (<><Progress steps={4} index={currentStep} />
        <StepWizard onStepChange={({ activeStep }) => setCurrentStep(activeStep)} className='flex-center'>
            <Central />
            <Conditions />
            <Configure />
        </StepWizard>
    </>)
});

export default App;