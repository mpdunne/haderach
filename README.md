# Haderach

A quiz app!

![Answer feedback with Mimo](assets/screenshots/quiz.png)


## How to run it!

Haderach can be run as-is on any web server.

To run a downloaded copy on a computer (requires Python 3):

1. Open Terminal in the Haderach folder.
2. Paste this command and press Enter:

   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

3. Open [Haderach](http://127.0.0.1:8000) in a browser.

Keep Terminal open while using the app. Press **Ctrl+C** in Terminal to stop it.

This extra step lets the browser load the question files; double-clicking
`index.html` won't load them.

## How do I add questions?

To use Haderach, you'll need to add some question sets!

To do this, click **Add question set** in the Library, select a CSV or Excel (`.xlsx`) file, check the suggested name, and confirm.

Sets and progress are saved in the current browser on the current device. They don't sync across devices and are removed when site data is cleared.

### CSV / Excel format

Use one question per row, with A, B, C, or D in the `Correct` column. For Excel,
put the table on the first worksheet:

| Question | A | B | C | D | Correct | Topic | Explanation | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| What is the capital of France? | Paris | Lyon | Marseille | Lille | A | Geography | Paris is the capital of France. | Geography notes |
| How many sides does a triangle have? | Two | Three | Four | Five | B | Maths | A triangle has three sides. | Geometry notes |

The `Topic`, `Explanation`, and `Source` are optional. A source can be a book, article, or other reference—it appears beneath the explanation after answering.
