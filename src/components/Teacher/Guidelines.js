import React from 'react';
import './Guidelines.css';
import './TeacherDashboard.css';

const Guidelines = () => {
  return (
    <div className="classroom-main">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            <h2 className="topbar-title">Guidelines</h2>
            <p className="topbar-subtitle">
              Reference guide for Technology for Teaching and Learning (TTL) competencies
            </p>
          </div>
        </div>
      </div>

      <div className="guidelines-container">
        <div className="guidelines-content">
        <div className="competency-table-wrapper">
          <table className="competency-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Competency</th>
              </tr>
            </thead>
            <tbody>
              <tr className="domain-row">
                <td rowSpan="3" className="domain-cell">
                  <strong>Domain 1:</strong><br />
                  Understanding ICT in Education
                </td>
                <td>1.1 Demonstrate awareness of policies affecting ICT in education</td>
              </tr>
              <tr>
                <td>1.2 Comply with ICT policies as they affect teaching-learning</td>
              </tr>
              <tr>
                <td>1.3 Contextualizes ICT policies to the learning environment</td>
              </tr>

              <tr className="domain-row">
                <td rowSpan="4" className="domain-cell">
                  <strong>Domain 2:</strong><br />
                  Curriculum and Assessment
                </td>
                <td>2.1 Demonstrate understanding of concepts, principles and theories of ICT system as they apply to teaching-learning</td>
              </tr>
              <tr>
                <td>2.2 Evaluate digital and non-digital learning resources in response to student's diverse needs</td>
              </tr>
              <tr>
                <td>2.3 Develop digital learning resources to enhance teaching-learning</td>
              </tr>
              <tr>
                <td>2.4 Use ICT tools to develop 21st century skills: information media technology skills, learning and innovation skills, career skills and effective communication skills</td>
              </tr>

              <tr className="domain-row">
                <td rowSpan="3" className="domain-cell">
                  <strong>Domain 3:</strong><br />
                  Pedagogy
                </td>
                <td>3.1 Apply relevant Technology tools for classroom activities</td>
              </tr>
              <tr>
                <td>3.2 Use ICT knowledge to solve complex problems and support student collaborative activities</td>
              </tr>
              <tr>
                <td>3.3 Model collaborative knowledge construction in face to face and virtual environments</td>
              </tr>

              <tr className="domain-row">
                <td rowSpan="3" className="domain-cell">
                  <strong>Domain 4:</strong><br />
                  Technology Tools
                </td>
                <td>4.1 Demonstrate competence in the technical operations of technology tools and system as they apply to teaching and learning</td>
              </tr>
              <tr>
                <td>4.2 Use technology tools to create new learning opportunities to support community of learners</td>
              </tr>
              <tr>
                <td>4.3 Demonstrate proficiency in the use of technology tools to support teaching and learning</td>
              </tr>

              <tr className="domain-row">
                <td rowSpan="2" className="domain-cell">
                  <strong>Domain 5:</strong><br />
                  Organization and Administration
                </td>
                <td>5.1 Manage technology-assisted instruction in an inclusive classroom environment</td>
              </tr>
              <tr>
                <td>5.2 Exhibit leadership in shared decision-making using technology tools</td>
              </tr>

              <tr className="domain-row">
                <td rowSpan="3" className="domain-cell">
                  <strong>Domain 6:</strong><br />
                  Teacher Professional Learning
                </td>
                <td>6.1 Explore existing and emerging technology to acquire additional content and pedagogical knowledge</td>
              </tr>
              <tr>
                <td>6.2 Utilize technology tools in creating communities of practice</td>
              </tr>
              <tr>
                <td>6.3 Collaborate with peers, colleagues and Stakeholders to access information in support of professional learning</td>
              </tr>

              <tr className="domain-row">
                <td rowSpan="2" className="domain-cell">
                  <strong>Domain 7:</strong><br />
                  Teacher Disposition
                </td>
                <td>7.1 Demonstrate social, ethical, and legal responsibility in the use of technology tools and resources</td>
              </tr>
              <tr>
                <td>7.2 Show positive attitude towards the use of technology tools</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="modules-section">
          <div className="module-category">
            <h2>Technology for Teaching and Learning 1 (TTL 101) Modules</h2>
            <ul className="module-list">
              <li>Module 1: Teaching and Learning with Technology: An Introduction</li>
              <li>Module 2: ICT Policies and Issues: Implications to Teaching and Learning</li>
              <li>Module 3: Non-digital and Digital Skills and Tools in Delivering Technology Enhanced Lessons</li>
              <li>Module 4: Social Ethical and Legal Responsibilities in the Use of Technology Tools and Resources</li>
              <li>Module 5: Theories and Principles in the Use and Design of Technology Driven Lessons</li>
              <li>Module 6: Innovative Technologies for Assessment Task in Teaching and Learning</li>
              <li>Module 7: Universal Design for Learning (UDL)</li>
              <li>Module 8: Producing Learning Resources Using Technology Tools</li>
              <li>Module 9: Integrating Active Learning approaches in Language-Learning</li>
            </ul>
          </div>

          <div className="module-category">
            <h2>Advanced TTL - CHED-Based Competencies</h2>
            <div className="ched-competencies">
              <div className="competency-item">
                <h3>1. Demonstrate Digital Literacy and ICT Proficiency</h3>
                <ul>
                  <li>Use productivity tools (word processing, spreadsheets, presentations)</li>
                  <li>Navigate and use Learning Management Systems (LMS)</li>
                  <li>Operate digital devices and multimedia tools needed for classroom instruction</li>
                  <li>Use ICT to communicate, collaborate, and produce learning materials</li>
                </ul>
                <p className="ched-basis">CHED Basis: Skills in "using technology tools in developing and using ICT resources" and "demonstrating proficiency in ICT."</p>
              </div>

              <div className="competency-item">
                <h3>2. Apply Technology-Integrated Pedagogical Knowledge (TPACK Framework)</h3>
                <ul>
                  <li>Integrate technology with content and pedagogy to support learning goals</li>
                  <li>Select developmentally appropriate digital tools based on lesson objectives</li>
                  <li>Design tech-enhanced learning experiences (online, blended, flipped classrooms)</li>
                </ul>
                <p className="ched-basis">CHED Basis: Ability to "apply pedagogical principles in the use of ICT" and integrate technology with instruction.</p>
              </div>

              <div className="competency-item">
                <h3>3. Design and Develop Digital Instructional Materials</h3>
                <ul>
                  <li>Creating multimedia learning resources (videos, slide decks, digital worksheets, modules)</li>
                  <li>Applying Universal Design for Learning (UDL) and accessibility standards</li>
                  <li>Using technology tools following instructional design principles</li>
                </ul>
                <p className="ched-basis">CHED Basis: Competency in "developing and utilizing appropriate and varied instructional materials using ICT."</p>
              </div>

              <div className="competency-item">
                <h3>4. Use Technology for Assessment and Learning Analytics</h3>
                <ul>
                  <li>Construct digital assessments (quizzes, performance tasks, e-portfolios)</li>
                  <li>Use online tools for gathering and analyzing student performance data</li>
                  <li>Interpret digital analytics to improve instructional decisions</li>
                </ul>
                <p className="ched-basis">CHED Basis: Competency in "using technology for assessment and evaluation."</p>
              </div>

              <div className="competency-item">
                <h3>5. Demonstrate Ethical, Legal, and Responsible Use of Technology</h3>
                <ul>
                  <li>Understand copyright, fair use, Creative Commons, and intellectual property rights</li>
                  <li>Model responsible digital citizenship (privacy, cybersecurity, online safety)</li>
                  <li>Promote ethical and safe use of ICT among learners</li>
                </ul>
                <p className="ched-basis">CHED Basis: "Observing legal, ethical, and moral responsibilities in the use of ICT."</p>
              </div>

              <div className="competency-item">
                <h3>6. Manage Technology-Enhanced Learning Environments</h3>
                <ul>
                  <li>Use ICT to manage classroom activities and instructional delivery</li>
                  <li>Troubleshoot basic technical problems</li>
                  <li>Ensure equitable and safe technology access for all learners</li>
                </ul>
                <p className="ched-basis">CHED Basis: Competency in "managing technology-supported learning environments."</p>
              </div>

              <div className="competency-item">
                <h3>7. Engage in Online Collaboration and Professional Growth</h3>
                <ul>
                  <li>Participate in online communities of practice</li>
                  <li>Use ICT for professional development and lifelong learning</li>
                  <li>Demonstrate innovative thinking by exploring emerging technologies (AR/VR, AI tools, simulations)</li>
                </ul>
                <p className="ched-basis">CHED Basis: "Engage in continuous professional learning using ICT tools."</p>
              </div>
            </div>

            <div className="ched-summary">
              <h3>CHED Summary Statement of TTL Expectations</h3>
              <p>
                The TTL course aims to develop <strong>future teachers who can use technology effectively, ethically, and creatively</strong> in planning, instruction, assessment, and classroom management. Students should graduate with the ability to <strong>integrate ICT</strong> to enhance teaching and to model responsible and innovative digital practices.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Guidelines;

