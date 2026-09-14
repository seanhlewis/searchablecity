"""Template: set backend to custom_adapter:Adapter and place module on PYTHONPATH."""


class Adapter:
    def __init__(self, config):
        self.config = config
        # Load your chosen model here.

    def caption(self, images):
        raise NotImplementedError(
            "Return one caption string per image, preserving input order."
        )
