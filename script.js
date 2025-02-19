let currentStepNumber = 1;
let guideObserver;

function initializeGuide() {
  currentStepNumber = 1;
  showOnlyCurrentStep();
  
  // Reset all steps
  const allSteps = document.querySelectorAll('.step-container');
  allSteps.forEach(step => {
    step.classList.remove('completed');
    
    // Reset sub-steps if any
    const subSteps = step.querySelector('.sub-steps');
    if (subSteps) {
      subSteps.classList.remove('active');
      
      // Reset toggle buttons
      const toggleButtons = subSteps.querySelectorAll('.toggle-button');
      toggleButtons.forEach(button => button.classList.remove('selected'));
      
      // Reset help boxes
      const helpBoxes = subSteps.querySelectorAll('.sub-step-help');
      helpBoxes.forEach(box => box.classList.remove('active'));
      
      // Reset progress bar
      const progressBar = subSteps.querySelector('.progress-bar');
      if (progressBar) progressBar.style.width = '0%';
      
      // Reset summary
      const summary = subSteps.querySelector('.sub-steps-summary');
      if (summary) summary.classList.remove('complete');
    }
    
    // Reset error messages
    const errorMessage = document.getElementById(step.id + "-error");
    if (errorMessage) {
      errorMessage.style.display = 'none';
      errorMessage.classList.remove('error');
    }
  });
}

// Setup observer to watch for guide loads/unloads
function setupGuideObserver() {
  if (guideObserver) {
    guideObserver.disconnect();
  }

  guideObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check added nodes and their children
      mutation.addedNodes.forEach(node => {
        // Check if the node itself is our target
        if (node.id === 'interactive-guide-loaded') {
          console.log('Guide loaded directly - initializing...');
          initializeGuide();
          return;
        }

        // If it's an element node, traverse its children
        if (node.nodeType === Node.ELEMENT_NODE) {
          const guideNode = node.querySelector('#interactive-guide-loaded');
          if (guideNode) {
            console.log('Guide loaded in subtree - initializing...');
            initializeGuide();
            return;
          }
        }
      });
    }
  });

  // Start observing the document with the configured parameters
  guideObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}

function showOnlyCurrentStep() {
  const allSteps = document.querySelectorAll('.step-container');
  allSteps.forEach((step, index) => {
    const stepNum = index + 1;
    if (stepNum === currentStepNumber) {
      step.classList.add('active');
      step.classList.add('current');
    } else {
      step.classList.remove('active');
      step.classList.remove('current');
    }
  });
  
  // Update step indicators
  updateStepIndicators();
}

function updateStepIndicators() {
  const indicators = document.querySelectorAll('.step-indicator');
  indicators.forEach((indicator, index) => {
    const stepNum = index + 1;
    indicator.classList.toggle('current', stepNum === currentStepNumber);
    indicator.classList.toggle('completed', stepNum < currentStepNumber);
  });
}

function goToStep(stepNumber) {
  if (stepNumber < 1) return;
  
  const targetStep = document.getElementById('step' + stepNumber);
  if (!targetStep) return;
  
  // Only allow going back to completed steps or one step forward
  if (stepNumber < currentStepNumber || stepNumber === currentStepNumber + 1) {
    currentStepNumber = stepNumber;
    showOnlyCurrentStep();
  }
}

function handleResponse(stepId, isYes) {
  const currentStep = document.getElementById(stepId);
  const errorMessage = document.getElementById(stepId + "-error");
  const subSteps = document.getElementById(stepId + "-substeps");

  if (isYes) {
    if (subSteps) {
      subSteps.classList.add("active");
      return; // Don't proceed to next step until sub-steps are completed
    }
    
    currentStep.classList.add("completed");
    errorMessage.style.display = "none";
    
    // Proceed to next step
    goToStep(currentStepNumber + 1);
  } else {
    errorMessage.classList.add("error");
    errorMessage.style.display = "block";
    if (subSteps) {
      subSteps.classList.remove("active");
    }
  }
}

function handleSubStep(stepId, subStepId, hasIt) {
  const subStepElement = document.getElementById(subStepId);
  const helpBox = document.getElementById(subStepId + "-help");
  const yesButton = subStepElement.querySelector('.toggle-button.yes');
  const noButton = subStepElement.querySelector('.toggle-button.no');
  
  // Update button states
  yesButton.classList.toggle('selected', hasIt);
  noButton.classList.toggle('selected', !hasIt);
  
  // Show/hide help box
  if (helpBox) {
    helpBox.classList.toggle('active', !hasIt);
  }
  
  // Update progress
  updateProgress(stepId);
}

function updateProgress(stepId) {
  const subSteps = document.getElementById(stepId + "-substeps");
  const subStepElements = subSteps.querySelectorAll('.checkbox-item');
  const progressBar = document.getElementById(stepId + "-progress");
  const summary = document.getElementById(stepId + "-summary");
  
  const total = subStepElements.length;
  const completed = Array.from(subStepElements).filter(item => 
    item.querySelector('.toggle-button.yes.selected')
  ).length;
  
  const progress = (completed / total) * 100;
  progressBar.style.width = progress + "%";
  
  // If all sub-steps are completed
  if (completed === total) {
    summary.classList.add("complete");
    setTimeout(() => {
      const currentStep = document.getElementById(stepId);
      currentStep.classList.add("completed");
      
      // Proceed to next step
      goToStep(currentStepNumber + 1);
    }, 1000);
  } else {
    summary.classList.remove("complete");
  }
}

function handleCheckbox(stepId, checkboxId) {
  const checkbox = document.getElementById(checkboxId);
  const item = checkbox.closest('.checkbox-item');
  
  if (checkbox.checked) {
    item.classList.add('completed');
  } else {
    item.classList.remove('completed');
  }
  
  updateProgress(stepId);
}

// Initialize immediately since the script is loaded with the component
setupGuideObserver();

// Check if guide is already in the DOM (for initial load)
if (document.getElementById('interactive-guide-loaded')) {
  initializeGuide();
}

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
  if (guideObserver) {
    guideObserver.disconnect();
  }
});
