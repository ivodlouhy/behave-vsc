# ruff: noqa
from behave import *

@given("we have behave installed")
@given("we have (behave) installed")
def step_inst(context):
    pass


@when("we implement a {successful_or_failing} test")
@when('"we" implement a [{successful_or_failing}] test')
def step_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"


@then("we will see the result")
@then("we will *see* the result")
def step_res(context):
    assert 1 == 1

@given(
    "we have line "
    "break in step1"
)
def step_lb1(context):
    pass

@given("we have line "
    "break in step2"
)
def step_lb2(context):
    pass

@given(
    "we have line "
    "break in step3")
def step_lb3(context):
    pass