# Haderach

A quiz app!

![Answer feedback with Mimo](assets/screenshots/quiz.png)

## How to add questions!

To use Haderach, you'll need to add some question sets!

To do this, click **Add question set** in the Library, select a JSON, CSV, or Excel (`.xlsx`) file, check the suggested name, and confirm.

Sets and progress are saved in the current browser on the current device. They don't sync across devices and are removed when site data is cleared.

### CSV / Excel format

To add via an Excel/CSV file, supply a table in the following format:

| Question | A | B | C | D | Correct | Topic | Explanation | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| What is the capital of France? | Paris | Lyon | Marseille | Lille | A | Geography | Paris is the capital of France. | Geography notes |
| How many sides does a triangle have? | Two | Three | Four | Five | B | Maths | A triangle has three sides. | Geometry notes |

The `Topic`, `Explanation`, and `Source` are optional. A source can be a book, article, or other reference—it appears beneath the explanation after answering.


### JSON format

For JSON, copy this example into a file called `questions.json` and add more questions to the list.

The only difference to watch for: `correct` counts from zero, so **0 = A, 1 = B, 2 = C, 3 = D**. IDs are added automatically; `name`, `topic`, `explanation`, and `source` can be left out.

```json
{
  "name": "Geography",
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["Paris", "Lyon", "Marseille", "Lille"],
      "correct": 0,
      "topic": "Geography",
      "explanation": "Paris is the capital of France.",
      "source": "Geography notes"
    }
  ]
}
```
