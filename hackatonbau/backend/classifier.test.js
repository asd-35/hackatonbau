import test from 'node:test'
import assert from 'node:assert/strict'
import {classifyEvidence} from './classifier.js'

function types(text, name='Voice_123.webm', category='voice') {
    return classifyEvidence({name,text,category}).types
}

test('injury, ambulance and on-site test are classified across multiple report types', () => {
    assert.deepEqual(types('Ahmet fell from the grave today and broke his leg. The ambulance came. We did a test on the scene and some packages were missing.'), [
        'Daily Construction Report','Incident/Safety Report','Site Inspection Report'
    ])
})
test('installation is progress, not automatically equipment or safety', () => {
    assert.deepEqual(types('Five workers installed 20 doors today.'), [
        'Daily Construction Report','Construction Progress Report'
    ])
})
test('machinery breakdown is equipment, not injury', () => {
    assert.deepEqual(types('The construction lift stopped working due to a hydraulic problem.'), [
        'Daily Construction Report','Equipment Breakdown Report'
    ])
})
test('mixed transcript can belong to five report types', () => {
    const transcript='12 workers installed ten windows, 75 percent planned. Inspection tested the glass and found cracked frames. A worker fell and an ambulance was called. The lift failed due to a hydraulic fault.'
    assert.equal(types(transcript).length,5)
})
test('negated accidents and injuries alone do not trigger incident report', () => {
    assert.deepEqual(types('There were no accidents or injuries today.'), ['Daily Construction Report'])
})
test('undecoded recording remains unassigned for review', () => {
    assert.deepEqual(types(''), [])
})